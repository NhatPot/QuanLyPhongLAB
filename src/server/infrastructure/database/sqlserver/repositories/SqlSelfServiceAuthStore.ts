import sql from "mssql";
import { randomUUID } from "crypto";
import {FIT_SSO_PROVIDER, ssoSubject} from "../../../../shared/sso-subject";
import { SqlConnectionFactory } from "../connection";
import type {
  AccountRole,
  AccountSetupProfile,
  AuthAccount,
  AuthChallenge,
  AuthMail,
  AuthPurpose,
  ISelfServiceAuthStore,
  RegistrationReview,
  SelfServiceTransaction,
} from "../../../../application/ports/ISelfServiceAuthStore";
import {
  ConflictError,
  NotFoundError,
} from "../../../../shared/errors/AppError";

const columns =
  "u.Id AS id,u.Email AS email,u.FullName AS fullName,u.Username AS username,u.PasswordHash AS passwordHash,u.Status AS status,u.DeletedAt AS deletedAt,u.EmailVerifiedAt AS emailVerifiedAt,u.Department AS department,u.Phone AS phone,CAST(CASE WHEN EXISTS(SELECT 1 FROM UserExternalIdentities ei WHERE ei.UserId=u.Id AND ei.Provider='FIT_LHU_SSO') THEN 1 ELSE 0 END AS BIT) AS ssoLinked,(SELECT ar.Status FROM AccountRegistrations ar WHERE ar.UserId=u.Id) AS registrationStatus";

export class SqlSelfServiceAuthStore implements ISelfServiceAuthStore {
  async transaction<T>(
    work: (tx: SelfServiceTransaction) => Promise<T>,
  ): Promise<T> {
    const transaction = new sql.Transaction(
      await SqlConnectionFactory.getPool(),
    );
    await transaction.begin();
    try {
      // Low-volume auth writes share one DB lock, including counters and worker claims.
      // Unlike an in-process limiter, this also serializes multiple Node workers.
      await new sql.Request(transaction).query(`DECLARE @result INT;
        EXEC @result=sp_getapplock @Resource='lhu-self-service-auth',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
        IF @result<0 THROW 51002,'Auth is busy',1;`);
      const result = await work(new SqlAuthTransaction(transaction));
      await transaction.commit();
      return result;
    } catch (error) {
      try {
        await transaction.rollback();
      } catch {
        /* Preserve original error. */
      }
      if (
        [2601, 2627].includes(Number((error as { number?: number }).number))
      ) {
        throw new ConflictError(
          "Tài khoản hoặc liên kết đã tồn tại. Vui lòng đăng nhập.",
          "ACCOUNT_EXISTS",
        );
      }
      throw error;
    }
  }
}

class SqlAuthTransaction implements SelfServiceTransaction {
  constructor(private readonly tx: sql.Transaction) {}
  private async query<T = any>(
    text: string,
    values: Record<string, unknown> = {},
  ): Promise<sql.IResult<T>> {
    const request = new sql.Request(this.tx);
    for (const [name, value] of Object.entries(values)) {
      if (value instanceof Date) request.input(name, sql.DateTime2, value);
      else if (typeof value === "number") request.input(name, sql.Int, value);
      else if (typeof value === "boolean") request.input(name, sql.Bit, value);
      else request.input(name, sql.NVarChar(sql.MAX), value ?? null);
    }
    return request.query<T>(text);
  }
  async account(email: string) {
    const result = await this.query<AuthAccount>(
      `SELECT ${columns} FROM Users u WITH (UPDLOCK,HOLDLOCK) WHERE u.EmailNormalized=@email`,
      { email },
    );
    return result.recordset[0] || null;
  }
  async accountById(id: string) {
    const result = await this.query<AuthAccount>(
      `SELECT ${columns} FROM Users u WITH (UPDLOCK,HOLDLOCK) WHERE u.Id=@id`,
      { id },
    );
    return result.recordset[0] || null;
  }
  async accountByGoogle(sub: string) {
    const result = await this.query<AuthAccount>(
      `SELECT ${columns} FROM Users u WITH (UPDLOCK,HOLDLOCK)
      INNER JOIN UserExternalIdentities e ON e.UserId=u.Id WHERE e.Provider='GOOGLE' AND e.Subject=@sub`,
      { sub },
    );
    return result.recordset[0] || null;
  }
  async accountBySso(issuer: string, subject: string) {
    const result=await this.query<AuthAccount>(`SELECT ${columns} FROM Users u WITH (UPDLOCK,HOLDLOCK)
      INNER JOIN UserExternalIdentities ei ON ei.UserId=u.Id WHERE ei.Provider=@provider AND ei.Subject=@subject`,
      {provider:FIT_SSO_PROVIDER,subject:ssoSubject(issuer,subject)});
    return result.recordset[0] || null;
  }
  async linkSso(userId: string, issuer: string, subject: string, email: string) {
    const result=await this.query(`INSERT INTO UserExternalIdentities (Id,UserId,Provider,Subject,EmailAtLink)
      SELECT @id,Id,@provider,@subject,@email FROM Users WITH (UPDLOCK,HOLDLOCK)
      WHERE Id=@userId AND EmailNormalized=@email AND DeletedAt IS NULL AND Status IN ('ACTIVE','INACTIVE');
      UPDATE Users SET EmailVerifiedAt=COALESCE(EmailVerifiedAt,SYSUTCDATETIME()) WHERE Id=@userId;`,
      {id:randomUUID(),userId,provider:FIT_SSO_PROVIDER,subject:ssoSubject(issuer,subject),email});
    if(result.rowsAffected[0]!==1)throw new ConflictError("Tài khoản đã thay đổi. Vui lòng đăng nhập lại.");
  }
  async completeSsoProfile(id: string, profile: AccountSetupProfile) {
    const result=await this.query(`UPDATE Users SET FullName=@fullName,Department=@department,Phone=@phone,UpdatedAt=SYSUTCDATETIME()
      WHERE Id=@id AND Status='ACTIVE' AND DeletedAt IS NULL
      AND EXISTS(SELECT 1 FROM UserExternalIdentities WHERE UserId=@id AND Provider=@provider)`,{id,...profile,provider:FIT_SSO_PROVIDER});
    if(result.rowsAffected[0]!==1)throw new ConflictError("Tài khoản không còn khả dụng.");
  }
  async createAccount(
    account: AuthAccount,
    role: AccountRole,
    googleSub?: string,
  ) {
    await this.query(
      `INSERT INTO Users (Id,Email,EmailNormalized,FullName,Username,UsernameNormalized,PasswordHash,Status,MustChangePassword,EmailVerifiedAt,Department,Phone)
      VALUES (@id,@email,@email,@fullName,@username,@username,@passwordHash,@status,0,SYSUTCDATETIME(),@department,@phone);`,
      account as unknown as Record<string, unknown>,
    );
    if (role === "STUDENT") {
      const result = await this.query(
        `INSERT INTO UserRoles (UserId,RoleId) SELECT @id,Id FROM Roles WHERE Code='STUDENT'`,
        { id: account.id },
      );
      if (result.rowsAffected[0] !== 1)
        throw new Error("Student role is not provisioned");
    } else
      await this.query(
        `INSERT INTO AccountRegistrations (Id,UserId) VALUES (@id,@userId)`,
        { id: randomUUID(), userId: account.id },
      );
    if (googleSub) await this.linkGoogle(account.id, googleSub, account.email);
  }
  async googleLinked(userId: string) {
    const result = await this.query(
      "SELECT 1 AS linked FROM UserExternalIdentities WHERE UserId=@userId AND Provider='GOOGLE'",
      { userId },
    );
    return result.recordset.length > 0;
  }
  async linkGoogle(userId: string, sub: string, email: string) {
    await this.query(
      `INSERT INTO UserExternalIdentities (Id,UserId,Provider,Subject,EmailAtLink) VALUES (@id,@userId,'GOOGLE',@sub,@email);
      UPDATE Users SET EmailVerifiedAt=COALESCE(EmailVerifiedAt,SYSUTCDATETIME()) WHERE Id=@userId;`,
      { id: randomUUID(), userId, sub, email },
    );
  }
  async setPassword(userId: string, hash: string) {
    await this.query(
      `UPDATE Users SET PasswordHash=@hash,MustChangePassword=0,EmailVerifiedAt=COALESCE(EmailVerifiedAt,SYSUTCDATETIME()),UpdatedAt=SYSUTCDATETIME() WHERE Id=@userId;
      UPDATE AuthSessions SET RevokedAt=SYSUTCDATETIME() WHERE UserId=@userId AND RevokedAt IS NULL;`,
      { userId, hash },
    );
  }
  async changeEmail(userId: string, email: string) {
    await this.query(
      `UPDATE Users SET Email=@email,EmailNormalized=@email,EmailVerifiedAt=SYSUTCDATETIME(),UpdatedAt=SYSUTCDATETIME() WHERE Id=@userId;
      UPDATE AuthSessions SET RevokedAt=SYSUTCDATETIME() WHERE UserId=@userId AND RevokedAt IS NULL;`,
      { userId, email },
    );
  }
  async completeAccountSetup(userId: string, profile: AccountSetupProfile, hash: string) {
    const result = await this.query(
      `UPDATE Users SET FullName=@fullName,Username=EmailNormalized,UsernameNormalized=EmailNormalized,
        Department=@department,Phone=@phone,PasswordHash=@hash,MustChangePassword=0,UpdatedAt=SYSUTCDATETIME()
       WHERE Id=@userId AND PasswordHash IS NULL AND Status='ACTIVE' AND DeletedAt IS NULL;`,
      {userId, ...profile, phone: profile.phone || null, hash},
    );
    if (result.rowsAffected[0] !== 1) throw new ConflictError('Tài khoản đã thay đổi. Vui lòng đăng nhập lại.');
    await this.query('UPDATE AuthSessions SET RevokedAt=SYSUTCDATETIME() WHERE UserId=@userId AND RevokedAt IS NULL', {userId});
  }
  async challenge(id: string) {
    const result = await this.query<{ StateJson: string }>(
      "SELECT StateJson FROM AuthChallenges WHERE Id=@id",
      { id },
    );
    return result.recordset[0]
      ? (JSON.parse(result.recordset[0].StateJson) as AuthChallenge)
      : null;
  }
  async saveChallenge(c: AuthChallenge) {
    await this.query(
      `MERGE AuthChallenges AS t USING (SELECT @id Id) s ON t.Id=s.Id
      WHEN MATCHED THEN UPDATE SET StateJson=@state,ExpiresAt=@expiry
      WHEN NOT MATCHED THEN INSERT (Id,Email,Purpose,StateJson,ExpiresAt) VALUES (@id,@email,@purpose,@state,@expiry);`,
      {
        id: c.id,
        email: c.email,
        purpose: c.purpose,
        state: JSON.stringify(c),
        expiry: new Date(c.grantExpiresAt || c.expiresAt),
      },
    );
  }
  async invalidate(email: string, purpose: AuthPurpose) {
    await this.query(
      `UPDATE AuthChallenges SET StateJson=JSON_MODIFY(StateJson,'$.consumedAt',CONVERT(NVARCHAR(40),SYSUTCDATETIME(),127)+'Z') WHERE Email=@email AND Purpose=@purpose`,
      { email, purpose },
    );
  }
  async budget(key: string, since: Date) {
    const result = await this.query(
      `SELECT COUNT(*) AS count,MIN(OccurredAt) AS firstAt,MAX(OccurredAt) AS lastAt FROM AuthRateEvents WHERE KeyHash=@key AND OccurredAt>@since`,
      { key, since },
    );
    return result.recordset[0] as {
      count: number;
      firstAt: Date | null;
      lastAt: Date | null;
    };
  }
  async spend(key: string, at: Date) {
    await this.query(
      "INSERT INTO AuthRateEvents (KeyHash,OccurredAt) VALUES (@key,@at)",
      { key, at },
    );
  }
  async enqueue(mail: AuthMail) {
    await this.query(
      `INSERT INTO AuthEmailOutbox (Id,ChallengeId,Ciphertext,ExpiresAt) VALUES (@id,@challengeId,@ciphertext,@expiresAt)`,
      mail as unknown as Record<string, unknown>,
    );
  }
  async resetBudget(key: string) {
    await this.query("DELETE FROM AuthRateEvents WHERE KeyHash=@key", { key });
  }
  async claimMail(now: Date) {
    const result = await this.query<AuthMail>(
      `SELECT TOP 1 Id AS id,ChallengeId AS challengeId,Ciphertext AS ciphertext,ExpiresAt AS expiresAt,Attempts AS attempts,Status AS status
      FROM AuthEmailOutbox WHERE (Status='QUEUED' AND RetryAt<=@now) OR (Status='PROCESSING' AND UpdatedAt<DATEADD(minute,-5,@now)) ORDER BY RetryAt,Id`,
      { now },
    );
    const mail = result.recordset[0];
    if (!mail) return null;
    await this.query(
      `UPDATE AuthEmailOutbox SET Status='PROCESSING',Attempts=Attempts+1,UpdatedAt=@now WHERE Id=@id`,
      { now, id: mail.id },
    );
    return { ...mail, attempts: mail.attempts + 1 };
  }
  async finishMail(id: string, status: string, retryAt?: Date) {
    await this.query(
      `UPDATE AuthEmailOutbox SET Status=@status,RetryAt=COALESCE(@retryAt,RetryAt),UpdatedAt=SYSUTCDATETIME(),
      Ciphertext=CASE WHEN @status IN ('SENT','FAILED','EXPIRED') THEN N'' ELSE Ciphertext END WHERE Id=@id`,
      { id, status, retryAt },
    );
  }
  async listReviews() {
    const result = await this
      .query<RegistrationReview>(`SELECT TOP 100 a.Id AS id,a.UserId AS userId,u.FullName AS fullName,u.Email AS email,a.Status AS status,a.SubmittedAt AS submittedAt,a.ReviewNote AS reviewNote
      FROM AccountRegistrations a INNER JOIN Users u ON u.Id=a.UserId WHERE a.Status='PENDING_REVIEW' AND u.DeletedAt IS NULL ORDER BY a.SubmittedAt`);
    return result.recordset;
  }
  async decideReview(
    id: string,
    approved: boolean,
    actorId: string,
    note: string,
  ) {
    const result = await this.query<{ UserId: string; Status: string }>(
      "SELECT UserId,Status FROM AccountRegistrations WHERE Id=@id",
      { id },
    );
    const review = result.recordset[0];
    if (!review) throw new NotFoundError();
    if (review.Status !== "PENDING_REVIEW")
      throw new ConflictError("Yêu cầu đã được xử lý.");
    const user = await this.accountById(review.UserId);
    if (!user || user.deletedAt || user.status !== "INACTIVE")
      throw new ConflictError("Tài khoản không còn đủ điều kiện duyệt.");
    await this.query(
      `UPDATE AccountRegistrations SET Status=@status,ReviewedBy=@actorId,ReviewedAt=SYSUTCDATETIME(),ReviewNote=@note WHERE Id=@id`,
      { id, status: approved ? "APPROVED" : "REJECTED", actorId, note },
    );
    if (approved) {
      const role = await this.query(
        `INSERT INTO UserRoles (UserId,RoleId) SELECT @userId,Id FROM Roles WHERE Code='TEACHER'`,
        { userId: user.id },
      );
      if (role.rowsAffected[0] !== 1)
        throw new Error("Teacher role is not provisioned");
      await this.query(
        `UPDATE Users SET Status='ACTIVE',UpdatedAt=SYSUTCDATETIME() WHERE Id=@id`,
        { id: user.id },
      );
    }
    await this.audit(
      approved ? "REGISTRATION_APPROVED" : "REGISTRATION_REJECTED",
      actorId,
      user.id,
    );
    return user;
  }
  async audit(action: string, userId?: string, entityId?: string) {
    await this.query(
      `INSERT INTO AuditLogs (Id,UserId,Action,EntityName,EntityId) VALUES (@id,@userId,@action,'Users',@entityId)`,
      { id: randomUUID(), userId, action, entityId: entityId || userId },
    );
  }
  async cleanup(now: Date) {
    await this.query(
      `UPDATE AuthEmailOutbox SET Status='EXPIRED',Ciphertext=N'' WHERE ExpiresAt<@now AND Status IN ('QUEUED','PROCESSING');
      DELETE FROM AuthEmailOutbox WHERE UpdatedAt<DATEADD(day,-7,@now) AND Status IN ('SENT','FAILED','EXPIRED');
      DELETE FROM AuthChallenges WHERE ExpiresAt<DATEADD(day,-2,@now) AND Id NOT IN (SELECT ChallengeId FROM AuthEmailOutbox WHERE ChallengeId IS NOT NULL);
      DELETE FROM AuthRateEvents WHERE OccurredAt<DATEADD(day,-2,@now);`,
      { now },
    );
  }
}
