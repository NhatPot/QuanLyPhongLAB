import { describe, it, expect, vi } from "vitest";
import { SelfServiceAuth, type AuthFlowContext } from "./SelfServiceAuth";
import type {
  AuthMailPayload,
  GoogleIdentity,
} from "../../ports/IAuthDelivery";
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
} from "../../ports/ISelfServiceAuthStore";
import type { SelfServiceConfig } from "../../../infrastructure/auth/self-service-config";
import {
  ConflictError,
  UnauthorizedError,
} from "../../../shared/errors/AppError";

import {MemoryStore} from "./MemoryAuthStore.test-support";
const context = { binding: "b".repeat(64), ip: "test-client" };
const student = "123456@lachong.edu.vn";
const registrationProfile = {department:"Khoa CNTT", phone:"0901234567"};
function setup(overrides: Partial<SelfServiceConfig> = {}) {
  const store = new MemoryStore();
  const delivery = {
    verify: vi.fn(async () => {}),
    encrypt: (p: AuthMailPayload) => JSON.stringify(p),
    send: vi.fn(async (_cipher: string) => {}),
  };
  const verifier = { verify: vi.fn<(_: string) => Promise<GoogleIdentity>>() };
  const hasher = {
    hash: vi.fn(async (p: string) => "hash:" + p),
    compare: vi.fn(async (p: string, h: string) => h === "hash:" + p),
  };
  let clock = Date.parse("2026-11-03T05:00:00Z");
  const config: SelfServiceConfig = {
    registrationEnabled: true,
    googleEnabled: true,
    mailReady: true,
    googleClientId: "client",
    hostedDomains: ["lhu.edu.vn"],
    studentDomains: ["lachong.edu.vn"],
    teacherDomains: ["lhu.edu.vn"],
    secret: "s".repeat(48),
    outboxKey: "a".repeat(64),
    senderBudget: 500,
    ...overrides,
  };
  const service = new SelfServiceAuth(
    config,
    store,
    delivery,
    hasher,
    verifier,
    () => new Date(clock),
  );
  const advance = (ms: number) => {
    clock += ms;
  };
  const otp = () => {
    const p = JSON.parse(
      store.state.mails
        .filter((m) => JSON.parse(m.ciphertext).kind === "otp")
        .at(-1)!.ciphertext,
    ) as Extract<AuthMailPayload, { kind: "otp" }>;
    return p.code;
  };
  const account = (changes: Partial<AuthAccount> = {}) => {
    const u: AuthAccount = {
      id: "11111111-1111-4111-8111-111111111111",
      email: student,
      fullName: "Sinh viên",
      username: "student",
      passwordHash: "hash:old-password-123",
      status: "ACTIVE",
      deletedAt: null,
      emailVerifiedAt: new Date(clock),
      ...changes,
    };
    store.state.accounts.set(u.id, u);
    return u;
  };
  async function verified(
    email = student,
    purpose:
      | "REGISTER"
      | "RESET_PASSWORD"
      | "SET_PASSWORD"
      | "CHANGE_EMAIL" = "REGISTER",
    ctx: AuthFlowContext = context,
  ) {
    const challenge = await service.requestCode({ email, purpose }, ctx);
    return service.verifyCode(challenge.challengeId, otp(), purpose, ctx);
  }
  async function google(
    email = student,
    hd: string | undefined = "lhu.edu.vn",
    name = "Nguyễn Văn An",
    sub = "google-123",
  ) {
    const nonce = await service.googleNonce(context);
    verifier.verify.mockResolvedValue({
      sub,
      email,
      name,
      nonce: nonce.nonce,
      hostedDomain: hd,
    });
    return {
      nonce,
      signIn: () => service.google("signed-token", nonce.challengeId, context),
    };
  }
  return {
    service,
    store,
    delivery,
    verifier,
    hasher,
    advance,
    otp,
    account,
    verified,
    google,
  };
}

describe("self-service auth rules", () => {
  it.each([
    {status:'ACTIVE', deletedAt:new Date('2026-11-04T03:00:00Z'), registrationStatus:'APPROVED', code:'ACCOUNT_DELETED'},
    {status:'LOCKED', deletedAt:null, registrationStatus:'APPROVED', code:'ACCOUNT_LOCKED'},
    {status:'INACTIVE', deletedAt:null, registrationStatus:'REJECTED', code:'REGISTRATION_REJECTED'},
  ])('returns the verified linked account status without reviving or recreating it: $code',async ({code,...changes})=>{
    const s=setup(),u=s.account(changes);
    await s.store.linkGoogle(u.id,'google-123',u.email);
    const g=await s.google();
    await expect(g.signIn()).rejects.toMatchObject({code});
    expect(s.store.state.accounts.size).toBe(1);
    expect(await s.store.accountById(u.id)).toMatchObject(changes);
    // Business-status errors still commit the consumed nonce.
    await expect(g.signIn()).rejects.toMatchObject({code:'CHALLENGE_INVALID'});
  });
  it('returns pending_review on repeated Google login before approval, and active after approval',async()=>{
    const s=setup(),g=await s.google('teacher@lhu.edu.vn');
    expect((await g.signIn()).state).toBe('pending_review');
    const again=await s.google('teacher@lhu.edu.vn');
    expect((await again.signIn()).state).toBe('pending_review');
    const review=s.store.state.reviews[0];
    await s.store.transaction(tx=>tx.decideReview(review.id,true,'admin',''));
    const after=await s.google('teacher@lhu.edu.vn');
    expect((await after.signIn()).state).toBe('active');
  });
  it('keeps Google teacher setup pending until approval and still requires a password after approval',async()=>{
    const s=setup({mailReady:false}),g=await s.google('teacher@lhu.edu.vn');
    const result=await g.signIn();expect(result.state).toBe('pending_review');
    const u=[...s.store.state.accounts.values()][0];
    const input={phone:'0901234567',fullName:'Giảng viên',department:'Khoa CNTT',password:'new-password-123',confirmPassword:'new-password-123'};
    await expect(s.service.completeAccountSetup(input,{...context,actorId:u.id})).rejects.toThrow();
    await s.store.transaction(tx=>tx.decideReview(u.id,true,'admin',''));
    const g2=await s.google('teacher@lhu.edu.vn');expect((await g2.signIn()).state).toBe('active');
    expect((await s.store.accountById(u.id))?.passwordHash).toBeNull();
    await s.service.completeAccountSetup(input,{...context,actorId:u.id});
    expect(s.store.state.roles.get(u.id)).toBe('TEACHER');
    expect((await s.store.accountById(u.id))?.username).toBe('teacher@lhu.edu.vn');
  });
  it('rolls back both profile/password and revocation when setup audit fails',async()=>{
    const s=setup(),u=s.account({passwordHash:null});await s.store.linkGoogle(u.id,'setup-google',u.email);
    vi.spyOn(s.store,'audit').mockRejectedValueOnce(new Error('Synthetic failure'));
    await expect(s.service.completeAccountSetup({phone:'0901234567',fullName:'Tên mới',department:'Khoa CNTT',password:'new-password-123',confirmPassword:'new-password-123'},{...context,actorId:u.id})).rejects.toThrow();
    expect((await s.store.accountById(u.id))?.passwordHash).toBeNull();
    expect((await s.store.accountById(u.id))?.fullName).toBe('Sinh viên');
    expect(s.store.state.revoked).toEqual([]);
  });
  it('completes a Google-only account atomically without SMTP, keeps email/role and rejects replay', async () => {
    const s = setup({mailReady:false});
    const u = s.account({passwordHash:null});
    await s.store.linkGoogle(u.id, 'setup-google', u.email);
    const input = {fullName:'Tên mới', department:'Khoa CNTT', phone:'0901234567', password:'new-password-123', confirmPassword:'new-password-123'};
    const results = await Promise.allSettled([
      s.service.completeAccountSetup(input, {...context, actorId:u.id}),
      s.service.completeAccountSetup(input, {...context, actorId:u.id}),
    ]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect(await s.store.accountById(u.id)).toMatchObject({email:u.email, username:u.email, fullName:'Tên mới', department:'Khoa CNTT', passwordHash:'hash:new-password-123'});
    expect(s.store.state.revoked).toEqual([u.id]);
    expect(s.store.state.mails).toHaveLength(0);
    expect(s.store.state.audit).toContain('ACCOUNT_SETUP_COMPLETED');
  });
  it.each([
    {fullName:'A', department:'Khoa CNTT'},
    {fullName:'Tên hợp lệ', department:''},
    {fullName:'Tên hợp lệ', department:'Khoa CNTT', confirmPassword:'different'},
    {fullName:'Tên hợp lệ', department:'Khoa CNTT', password:'short', confirmPassword:'short'},
  ])('rejects incomplete setup without changing credentials: %j', async changes => {
    const s=setup(), u=s.account({passwordHash:null});
    await s.store.linkGoogle(u.id,'setup-google',u.email);
    await expect(s.service.completeAccountSetup({phone:'0901234567',password:'new-password-123',confirmPassword:'new-password-123',...changes},{...context,actorId:u.id})).rejects.toThrow();
    expect((await s.store.accountById(u.id))?.passwordHash).toBeNull();
    expect(s.store.state.revoked).toEqual([]);
  });
  it.each(['INACTIVE','LOCKED'])('does not complete setup for a %s teacher', async status => {
    const s=setup(),u=s.account({passwordHash:null,status,registrationStatus:'PENDING_REVIEW'});
    await s.store.linkGoogle(u.id,'setup-google',u.email);
    await expect(s.service.completeAccountSetup({phone:'0901234567',fullName:'Tên mới',department:'Khoa CNTT',password:'new-password-123',confirmPassword:'new-password-123'},{...context,actorId:u.id})).rejects.toThrow();
    expect((await s.store.accountById(u.id))?.passwordHash).toBeNull();
  });
  it("pauses on sender authentication failure and resumes only after verification, preserving quotas", async () => {
    const s = setup({ senderBudget: 2 });
    await s.service.requestCode(
      { email: student, purpose: "REGISTER" },
      context,
    );
    s.delivery.send.mockRejectedValueOnce({
      code: "EAUTH",
      message: "Authentication failed",
    });
    await s.service.deliverNext();
    expect(await s.service.deliverNext()).toBe(false);
    s.delivery.verify.mockRejectedValueOnce(new Error("Still invalid"));
    await expect(s.service.resumeDelivery()).rejects.toBeTruthy();
    await expect(
      s.service.requestCode(
        { email: "other@lachong.edu.vn", purpose: "REGISTER" },
        context,
      ),
    ).rejects.toMatchObject({ statusCode: 429 });
    await s.service.resumeDelivery();
    await expect(
      s.service.requestCode(
        { email: "other@lachong.edu.vn", purpose: "REGISTER" },
        context,
      ),
    ).resolves.toBeTruthy();
    await expect(
      s.service.requestCode(
        { email: "third@lachong.edu.vn", purpose: "REGISTER" },
        context,
      ),
    ).rejects.toMatchObject({ statusCode: 429 });
  });
  it("does not treat an individual recipient mailbox quota as the sender quota", async () => {
    const s = setup();
    await s.service.requestCode(
      { email: student, purpose: "REGISTER" },
      context,
    );
    s.delivery.send.mockRejectedValueOnce({
      responseCode: 552,
      message: "Recipient mailbox quota exceeded 5.2.2",
    });
    await s.service.deliverNext();
    await expect(
      s.service.requestCode(
        { email: "other@lachong.edu.vn", purpose: "REGISTER" },
        context,
      ),
    ).resolves.toBeTruthy();
  });
  it("changes email only after proving both the old and new mailbox, then revokes sessions", async () => {
    const s = setup();
    const u = s.account();
    const ctx = { ...context, actorId: u.id };
    const oldProof = await s.verified(student, "CHANGE_EMAIL", ctx);
    const next = await s.service.requestNewEmail(
      { ...oldProof, email: "999999@lachong.edu.vn" },
      ctx,
    );
    await expect(
      s.service.completeEmailChange(oldProof, ctx),
    ).rejects.toBeTruthy();
    const newProof = await s.service.verifyCode(
      next.challengeId,
      s.otp(),
      "CHANGE_EMAIL_NEW",
      ctx,
    );
    await s.service.completeEmailChange(newProof, ctx);
    expect(s.store.state.accounts.get(u.id)?.email).toBe(
      "999999@lachong.edu.vn",
    );
    expect(s.store.state.revoked).toContain(u.id);
    await expect(
      s.service.completeEmailChange(newProof, ctx),
    ).rejects.toBeTruthy();
  });
  it("does not change account kind, link an existing email or use another actor to change email", async () => {
    const s = setup();
    const u = s.account();
    const ctx = { ...context, actorId: u.id };
    const proof = await s.verified(student, "CHANGE_EMAIL", ctx);
    await expect(
      s.service.requestNewEmail({ ...proof, email: "teacher@lhu.edu.vn" }, ctx),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      s.service.requestNewEmail({ ...proof, email: student }, ctx),
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      s.service.requestNewEmail(
        { ...proof, email: "999@lachong.edu.vn" },
        { ...ctx, actorId: "other" },
      ),
    ).rejects.toBeTruthy();
  });
  it("does not report rejected Google teachers as awaiting review", async () => {
    const s = setup();
    const first = await s.google("teacher@lhu.edu.vn");
    const created = await first.signIn();
    if (created.state !== "pending_review")
      throw new Error("Expected pending teacher");
    await s.service.review(
      created.userId,
      false,
      "admin",
      "Không đủ điều kiện",
    );
    const next = await s.google("teacher@lhu.edu.vn");
    await expect(next.signIn()).rejects.toMatchObject({
      code: "REGISTRATION_REJECTED",
    });
  });
  it.each(["REGISTER", "RESET_PASSWORD"] as const)(
    "allows first + five resends for %s; new challenges/browsers cannot reset the budget",
    async (purpose) => {
      const s = setup();
      if (purpose === "RESET_PASSWORD") s.account();
      let c = await s.service.requestCode({ email: student, purpose }, context);
      expect(c.resendsRemaining).toBe(5);
      for (let i = 0; i < 5; i++) {
        s.advance(61000);
        c =
          i === 2
            ? await s.service.requestCode(
                { email: student, purpose },
                { ...context, binding: "c".repeat(64) },
              )
            : await s.service.requestCode({ email: student, purpose }, context);
        expect(c.resendsRemaining).toBe(4 - i);
      }
      s.advance(61000);
      await expect(
        s.service.resend(c.challengeId, context),
      ).rejects.toMatchObject({ statusCode: 429 });
      expect(s.store.state.mails).toHaveLength(6);
      s.advance(3600001);
      expect(
        (await s.service.requestCode({ email: student, purpose }, context))
          .resendsRemaining,
      ).toBe(5);
    },
  );
  it("enforces cooldown and independent purpose budgets", async () => {
    const s = setup();
    await s.service.requestCode(
      { email: student, purpose: "REGISTER" },
      context,
    );
    await expect(
      s.service.requestCode({ email: student, purpose: "REGISTER" }, context),
    ).rejects.toMatchObject({ statusCode: 429 });
    expect(
      (
        await s.service.requestCode(
          { email: student, purpose: "RESET_PASSWORD" },
          context,
        )
      ).resendsRemaining,
    ).toBe(5);
  });
  it("rejects external domains and disabled features without persistence", async () => {
    const s = setup();
    await expect(
      s.service.requestCode(
        { email: "user@gmail.com", purpose: "REGISTER" },
        context,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(s.store.state.events).toHaveLength(0);
    const off = setup({ mailReady: false });
    await expect(
      off.service.requestCode({ email: student, purpose: "REGISTER" }, context),
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(off.store.state.challenges.size).toBe(0);
  });
  it("binds OTP to browser and purpose and prevents replay", async () => {
    const s = setup();
    const c = await s.service.requestCode(
      { email: student, purpose: "REGISTER" },
      context,
    );
    const otp = s.otp();
    await expect(
      s.service.verifyCode(c.challengeId, otp, "RESET_PASSWORD", context),
    ).rejects.toBeTruthy();
    await expect(
      s.service.verifyCode(c.challengeId, otp, "REGISTER", {
        ...context,
        binding: "other",
      }),
    ).rejects.toBeTruthy();
    await s.service.verifyCode(c.challengeId, otp, "REGISTER", context);
    await expect(
      s.service.verifyCode(c.challengeId, otp, "REGISTER", context),
    ).rejects.toBeTruthy();
  });
  it("commits failed attempts, and resend does not reset the five-attempt lock", async () => {
    const s = setup();
    let c = await s.service.requestCode(
      { email: student, purpose: "REGISTER" },
      context,
    );
    for (let i = 0; i < 5; i++)
      await expect(
        s.service.verifyCode(c.challengeId, "000000", "REGISTER", context),
      ).rejects.toMatchObject({ code: "OTP_INVALID" });
    s.advance(61000);
    c = await s.service.resend(c.challengeId, context);
    await expect(
      s.service.verifyCode(c.challengeId, s.otp(), "REGISTER", context),
    ).rejects.toMatchObject({ code: "OTP_INVALID" });
  });
  it("invalidates old codes and expires both OTP and registration grant", async () => {
    const s = setup();
    const first = await s.service.requestCode(
      { email: student, purpose: "REGISTER" },
      context,
    );
    const old = s.otp();
    s.advance(61000);
    const second = await s.service.resend(first.challengeId, context);
    await expect(
      s.service.verifyCode(first.challengeId, old, "REGISTER", context),
    ).rejects.toBeTruthy();
    s.advance(300001);
    await expect(
      s.service.verifyCode(second.challengeId, s.otp(), "REGISTER", context),
    ).rejects.toBeTruthy();
    s.advance(3600000);
    const grant = await s.verified();
    s.advance(600001);
    await expect(
      s.service.completeRegistration(
        { ...grant, ...registrationProfile, fullName: "Nguyễn An", password: "a-good-passphrase" },
        context,
      ),
    ).rejects.toBeTruthy();
  });
  it("creates one student and only one concurrent completion succeeds", async () => {
    const s = setup();
    const grant = await s.verified();
    const results = await Promise.allSettled(
      [1, 2].map(() =>
        s.service.completeRegistration(
          { ...grant, ...registrationProfile, fullName: "Nguyễn An", password: "a-good-passphrase" },
          context,
        ),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(s.store.state.accounts.size).toBe(1);
    expect([...s.store.state.roles.values()]).toEqual(["STUDENT"]);
  });
  it("creates inactive teachers without a role until review; rejects repeat review", async () => {
    const s = setup();
    const grant = await s.verified("nhatlm@lhu.edu.vn");
    const result = await s.service.completeRegistration(
      { ...grant, ...registrationProfile, fullName: "Giảng viên", password: "a-good-passphrase" },
      context,
    );
    expect(result.state).toBe("pending_review");
    expect(s.store.state.roles.size).toBe(0);
    await s.service.review(result.userId, true, "admin", "");
    expect(s.store.state.accounts.get(result.userId)?.status).toBe("ACTIVE");
    expect(s.store.state.roles.get(result.userId)).toBe("TEACHER");
    await expect(
      s.service.review(result.userId, true, "admin", ""),
    ).rejects.toBeTruthy();
  });
  it("does not overwrite an existing account after registration verification", async () => {
    const s = setup();
    const grant = await s.verified();
    const u = s.account();
    await expect(
      s.service.completeRegistration(
        { ...grant, ...registrationProfile, fullName: "Attacker", password: "a-good-passphrase" },
        context,
      ),
    ).rejects.toMatchObject({ code: "ACCOUNT_EXISTS" });
    expect(s.store.state.accounts.get(u.id)?.fullName).toBe("Sinh viên");
  });
  it("saves the full email-registration profile and sets the password once", async () => {
    const s = setup(), grant = await s.verified();
    const result = await s.service.completeRegistration({...grant, ...registrationProfile,
      fullName:"Nguyễn An", password:"a-good-passphrase"}, context);
    expect(result.state).toBe("active");
    expect(await s.store.accountById(result.userId)).toMatchObject({
      fullName:"Nguyễn An", ...registrationProfile, passwordHash:"hash:a-good-passphrase",
    });
    expect(s.hasher.hash).toHaveBeenCalledTimes(1);
    await s.store.linkGoogle(result.userId,"linked-after-registration",student);
    await expect(s.service.completeAccountSetup({...registrationProfile,fullName:"Nguyễn An",
      password:"another-password-123",confirmPassword:"another-password-123"}, {...context,actorId:result.userId}))
      .rejects.toBeInstanceOf(ConflictError);
    expect((await s.store.accountById(result.userId))?.passwordHash).toBe("hash:a-good-passphrase");
  });
  it.each([
    {phone:undefined}, {phone:"   "}, {phone:"1".repeat(51)}, {department:undefined}, {department:" "},
  ])("rejects incomplete email registration atomically: %j", async changes => {
    const s = setup(), grant = await s.verified();
    await expect(s.service.completeRegistration({...grant,...registrationProfile,...changes,
      fullName:"Nguyễn An",password:"a-good-passphrase"},context)).rejects.toMatchObject({statusCode:400});
    expect(s.store.state.accounts.size).toBe(0);
    expect((await s.store.challenge(grant.challengeId))?.consumedAt).toBeUndefined();
  });
  it.each([undefined,"   ","1".repeat(51)])("requires phone during Google setup: %j", async phone => {
    const s=setup(), u=s.account({passwordHash:null});
    await s.store.linkGoogle(u.id,"setup-google",u.email);
    await expect(s.service.completeAccountSetup({fullName:"Nguyễn An",department:"Khoa CNTT",phone,
      password:"new-password-123",confirmPassword:"new-password-123"},{...context,actorId:u.id}))
      .rejects.toMatchObject({statusCode:400});
    expect((await s.store.accountById(u.id))?.passwordHash).toBeNull();
    expect(s.store.state.revoked).toEqual([]);
  });
  it.each([
    {},
    { passwordHash: null },
    { status: "LOCKED" },
    { status: "INACTIVE", registrationStatus: "PENDING_REVIEW" },
    { status: "INACTIVE", registrationStatus: "REJECTED" },
    { deletedAt: new Date("2026-11-02T00:00:00Z") },
  ])("blocks registration of an existing email before queuing OTP: %j", async changes => {
    const s = setup();
    s.account(changes);
    const before = structuredClone(s.store.state);
    await expect(s.service.requestCode(
      { email: `  ${student.toUpperCase()}  `, purpose: "REGISTER" }, context,
    )).rejects.toMatchObject({ code: "ACCOUNT_EXISTS", statusCode: 409 });
    expect(s.store.state).toEqual(before);
  });
  it("rejects verification and resend when an account was created after requesting OTP", async () => {
    const s = setup();
    const challenge = await s.service.requestCode({ email: student, purpose: "REGISTER" }, context);
    const code = s.otp();
    s.account();
    const before = structuredClone(s.store.state);
    await expect(s.service.verifyCode(challenge.challengeId, code, "REGISTER", context))
      .rejects.toMatchObject({ code: "ACCOUNT_EXISTS", statusCode: 409 });
    s.advance(61000);
    await expect(s.service.resend(challenge.challengeId, context))
      .rejects.toMatchObject({ code: "ACCOUNT_EXISTS", statusCode: 409 });
    expect(s.store.state).toEqual(before);
  });
  it("reset is single-use, revokes sessions, and rejects grants for changed email", async () => {
    const s = setup();
    const u = s.account();
    const grant = await s.verified(student, "RESET_PASSWORD");
    await s.service.resetPassword(
      { ...grant, password: "new-good-passphrase" },
      context,
    );
    expect(s.store.state.accounts.get(u.id)?.passwordHash).toBe(
      "hash:new-good-passphrase",
    );
    expect(s.store.state.revoked).toEqual([u.id]);
    await expect(
      s.service.resetPassword(
        { ...grant, password: "third-passphrase" },
        context,
      ),
    ).rejects.toBeTruthy();
    s.advance(61000);
    const next = await s.verified(student, "RESET_PASSWORD");
    s.store.state.accounts.get(u.id)!.email = "new@lachong.edu.vn";
    await expect(
      s.service.resetPassword(
        { ...next, password: "another-passphrase" },
        context,
      ),
    ).rejects.toBeTruthy();
  });
  it.each([
    { status: "INACTIVE" },
    { status: "LOCKED" },
    { passwordHash: null },
    { deletedAt: new Date() },
  ])("recovery does not bypass unavailable accounts: %j", async (changes) => {
    const s = setup();
    s.account(changes);
    const c = await s.service.requestCode(
      { email: student, purpose: "RESET_PASSWORD" },
      context,
    );
    expect(c.resendsRemaining).toBe(5);
    expect(s.store.state.mails).toHaveLength(0);
    await expect(
      s.service.verifyCode(c.challengeId, "123456", "RESET_PASSWORD", context),
    ).rejects.toBeTruthy();
  });
  it("adds a password for Google-only only through an authenticated bound OTP flow", async () => {
    const s = setup();
    const u = s.account({ passwordHash: null });
    const grant = await s.verified(student, "SET_PASSWORD", {
      ...context,
      actorId: u.id,
    });
    await expect(
      s.service.resetPassword(
        { ...grant, password: "new-good-passphrase" },
        { ...context, actorId: "other" },
        "SET_PASSWORD",
      ),
    ).rejects.toBeTruthy();
    await s.service.resetPassword(
      { ...grant, password: "new-good-passphrase" },
      { ...context, actorId: u.id },
      "SET_PASSWORD",
    );
    expect(s.store.state.accounts.get(u.id)?.passwordHash).toBe(
      "hash:new-good-passphrase",
    );
  });
  it("reuses the same browser's unused nonce without spending its initialization budget", async () => {
    const s=setup();
    const first=await s.service.googleNonce(context);
    for(let n=0;n<40;n++)expect(await s.service.googleNonce(context,first.challengeId)).toEqual(first);
    expect(s.store.state.challenges.size).toBe(1);
    expect(s.store.state.events).toHaveLength(1);
    s.verifier.verify.mockResolvedValue({sub:'reuse-google',email:student,name:'Sinh viên',hostedDomain:'lhu.edu.vn',nonce:first.nonce});
    await s.service.google('signed-token',first.challengeId,context);
    await expect(s.service.google('signed-token',first.challengeId,context)).rejects.toMatchObject({code:'CHALLENGE_INVALID'});
    const next=await s.service.googleNonce(context,first.challengeId);
    expect(next.challengeId).not.toBe(first.challengeId);
    expect(next.nonce).not.toBe(first.nonce);
  });
  it.each(['expired','wrong-binding','wrong-purpose','wrong-hash'])("does not reuse a nonce with %s",async kind=>{
    const s=setup(), first=await s.service.googleNonce(context);
    const c=s.store.state.challenges.get(first.challengeId)!;
    if(kind==='expired')s.advance(300001);
    if(kind==='wrong-binding')c.binding='0'.repeat(64);
    if(kind==='wrong-purpose')c.purpose='REGISTER';
    if(kind==='wrong-hash')c.codeHash='0'.repeat(64);
    const next=await s.service.googleNonce(context,first.challengeId);
    expect(next.challengeId).not.toBe(first.challengeId);
    expect(s.store.state.events).toHaveLength(2);
  });
  it("still limits fresh Google nonce creation even when callers omit the reuse cookie",async()=>{
    const s=setup();
    for(let n=0;n<30;n++)await s.service.googleNonce(context);
    await expect(s.service.googleNonce(context)).rejects.toMatchObject({statusCode:429});
    expect(s.store.state.challenges.size).toBe(30);
  });
  it("uses Google sub, creates Google-only student, and prevents nonce replay", async () => {
    const s = setup();
    const google = await s.google();
    const result = await google.signIn();
    expect(result.state).toBe("active");
    expect([...s.store.state.accounts.values()][0].passwordHash).toBeNull();
    expect(s.store.state.identities.get("google-123")).toBe(
      [...s.store.state.accounts.keys()][0],
    );
    await expect(google.signIn()).rejects.toBeTruthy();
  });
  it("never auto-links an existing email and consumes its Google nonce", async () => {
    const s = setup();
    s.account();
    const google = await s.google();
    await expect(google.signIn()).rejects.toMatchObject({
      code: "ACCOUNT_LINK_REQUIRED",
    });
    expect(s.store.state.identities.size).toBe(0);
    await expect(google.signIn()).rejects.toBeTruthy();
  });
  it("requires mailbox OTP without an authoritative hosted domain", async () => {
    const s = setup({ hostedDomains: [] });
    const google = await s.google();
    const result = await google.signIn();
    expect(result.state).toBe("verify_email");
    expect(s.store.state.accounts.size).toBe(0);
    if (result.state !== "verify_email") throw new Error("Expected OTP");
    const grant = await s.service.verifyCode(
      result.challengeId,
      s.otp(),
      "REGISTER",
      context,
    );
    const account = await s.service.completeRegistration(
      { ...grant, ...registrationProfile, fullName: "Sinh viên Google" },
      context,
    );
    expect(account.state).toBe("active");
    expect(s.store.state.identities.size).toBe(1);
  });
  it("reports the verified Workspace domain for setup without bypassing OTP or creating a user when mail is disabled", async () => {
    const s = setup({ hostedDomains: [], mailReady: false });
    const google = await s.google();
    await expect(google.signIn()).rejects.toMatchObject({
      code: "GOOGLE_EMAIL_VERIFICATION_UNAVAILABLE",
      details: { hostedDomain: "lhu.edu.vn" },
    });
    expect(s.store.state.accounts.size).toBe(0);
    expect(s.store.state.mails.length).toBe(0);
    await expect(google.signIn()).rejects.toBeTruthy();
  });
  it("rejects wrong Google nonce and an unavailable linked account", async () => {
    const s = setup();
    const google = await s.google();
    s.verifier.verify.mockResolvedValue({
      sub: "google-123",
      email: student,
      name: "An",
      nonce: "wrong",
      hostedDomain: "lhu.edu.vn",
    });
    await expect(google.signIn()).rejects.toBeTruthy();
    const u = s.account({ status: "LOCKED" });
    s.store.state.identities.set("google-123", u.id);
    const second = await s.google();
    await expect(second.signIn()).rejects.toBeTruthy();
  });
  it("enforces sender budget atomically, and never delivers invalidated or expired codes", async () => {
    const s = setup({ senderBudget: 1 });
    const c = await s.service.requestCode(
      { email: student, purpose: "REGISTER" },
      context,
    );
    await expect(
      s.service.requestCode(
        { email: "999@lachong.edu.vn", purpose: "REGISTER" },
        { ...context, ip: "other" },
      ),
    ).rejects.toMatchObject({ statusCode: 429 });
    s.advance(300001);
    await s.service.deliverNext();
    expect(s.delivery.send).not.toHaveBeenCalled();
    expect(s.store.state.mails[0].status).toBe("EXPIRED");
    expect(s.store.state.challenges.has(c.challengeId)).toBe(true);
  });
  it("retries temporary SMTP failures, while ordinary bad-recipient errors do not stop all mail", async () => {
    const s = setup();
    await s.service.requestCode(
      { email: student, purpose: "REGISTER" },
      context,
    );
    s.delivery.send.mockRejectedValueOnce({
      responseCode: 450,
      message: "Temporarily unavailable",
    });
    await s.service.deliverNext();
    expect(s.store.state.mails[0].status).toBe("QUEUED");
    s.advance(31000);
    await s.service.deliverNext();
    expect(s.store.state.mails[0].status).toBe("SENT");
    s.advance(61000);
    await s.service.requestCode(
      { email: student, purpose: "REGISTER" },
      context,
    );
    s.delivery.send.mockRejectedValueOnce({
      responseCode: 550,
      message: "No such user",
    });
    await s.service.deliverNext();
    await expect(
      s.service.requestCode(
        { email: "new@lachong.edu.vn", purpose: "REGISTER" },
        context,
      ),
    ).resolves.toBeTruthy();
  });
  it("opens a circuit for provider quota errors instead of sending repeatedly", async () => {
    const s = setup();
    await s.service.requestCode(
      { email: student, purpose: "REGISTER" },
      context,
    );
    s.delivery.send.mockRejectedValueOnce({
      responseCode: 550,
      message: "Daily sending limit exceeded",
    });
    await s.service.deliverNext();
    await expect(
      s.service.requestCode(
        { email: "new@lachong.edu.vn", purpose: "REGISTER" },
        context,
      ),
    ).rejects.toMatchObject({ statusCode: 429 });
    expect(await s.service.deliverNext()).toBe(false);
    expect(s.delivery.send).toHaveBeenCalledTimes(1);
  });
  it("rejects unsupported password sizes and forged Google assertions", async () => {
    const s = setup();
    const grant = await s.verified();
    await expect(
      s.service.completeRegistration(
        { ...grant, ...registrationProfile, fullName: "An", password: "short" },
        context,
      ),
    ).rejects.toBeTruthy();
    await expect(
      s.service.completeRegistration(
        { ...grant, ...registrationProfile, fullName: "An", password: "🔒".repeat(20) },
        context,
      ),
    ).rejects.toBeTruthy();
    const nonce = await s.service.googleNonce(context);
    s.verifier.verify.mockRejectedValue(new UnauthorizedError());
    await expect(
      s.service.google("forged-token", nonce.challengeId, context),
    ).rejects.toBeTruthy();
  });
});
