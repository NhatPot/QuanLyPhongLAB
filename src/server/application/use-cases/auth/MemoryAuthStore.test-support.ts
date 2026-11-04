import type {AccountRole, AccountSetupProfile, AuthAccount, AuthChallenge, AuthMail, AuthPurpose, ISelfServiceAuthStore, RegistrationReview, SelfServiceTransaction} from "../../ports/ISelfServiceAuthStore";
import {ConflictError} from "../../../shared/errors/AppError";
import {ssoSubject} from "../../../shared/sso-subject";
export class MemoryStore implements ISelfServiceAuthStore, SelfServiceTransaction {
  state = {
    accounts: new Map<string, AuthAccount>(),
    identities: new Map<string, string>(),
    ssoIdentities: new Map<string,string>(),
    roles: new Map<string, string>(),
    challenges: new Map<string, AuthChallenge>(),
    events: [] as { key: string; at: Date }[],
    mails: [] as (AuthMail & { retryAt?: Date })[],
    reviews: [] as RegistrationReview[],
    revoked: [] as string[],
    audit: [] as string[],
  };
  private tail = Promise.resolve();
  async transaction<T>(
    work: (tx: SelfServiceTransaction) => Promise<T>,
  ): Promise<T> {
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    const backup = structuredClone(this.state);
    try {
      return await work(this);
    } catch (error) {
      this.state = backup;
      throw error;
    } finally {
      release();
    }
  }
  async account(email: string) {
    return (
      [...this.state.accounts.values()].find((u) => u.email === email) || null
    );
  }
  async accountById(id: string) {
    return this.state.accounts.get(id) || null;
  }
  async accountByGoogle(sub: string) {
    return (
      this.state.accounts.get(this.state.identities.get(sub) || "") || null
    );
  }
  async googleLinked(id: string) {
    return [...this.state.identities.values()].includes(id);
  }
  async accountBySso(issuer:string,subject:string){return this.state.accounts.get(this.state.ssoIdentities.get(ssoSubject(issuer,subject))||'')||null;}
  async linkSso(id:string,issuer:string,subject:string,email:string){
    const key=ssoSubject(issuer,subject), a=this.state.accounts.get(id)!;
    if(this.state.ssoIdentities.has(key)||a.ssoLinked||a.email!==email)throw new ConflictError('Duplicate SSO');
    this.state.ssoIdentities.set(key,id);a.ssoLinked=true;
  }
  async completeSsoProfile(id:string,profile:AccountSetupProfile){Object.assign(this.state.accounts.get(id)!,profile);}
  async createAccount(account: AuthAccount, role: AccountRole, sub?: string) {
    if (await this.account(account.email)) throw new ConflictError("Duplicate");
    this.state.accounts.set(account.id, account);
    account.registrationStatus = role === "TEACHER" ? "PENDING_REVIEW" : null;
    if (role === "STUDENT") this.state.roles.set(account.id, role);
    else
      this.state.reviews.push({
        id: account.id,
        userId: account.id,
        fullName: account.fullName,
        email: account.email,
        status: "PENDING_REVIEW",
        submittedAt: new Date().toISOString(),
        reviewNote: null,
      });
    if (sub) await this.linkGoogle(account.id, sub, account.email);
  }
  async linkGoogle(id: string, sub: string, _email: string) {
    if (this.state.identities.has(sub) || (await this.googleLinked(id)))
      throw new ConflictError("Duplicate");
    this.state.identities.set(sub, id);
  }
  async setPassword(id: string, hash: string) {
    this.state.accounts.get(id)!.passwordHash = hash;
    this.state.revoked.push(id);
  }
  async completeAccountSetup(id: string, profile: AccountSetupProfile, hash: string) {
    Object.assign(this.state.accounts.get(id)!, profile, {passwordHash: hash, username: this.state.accounts.get(id)!.email});
    this.state.revoked.push(id);
  }
  async changeEmail(id: string, email: string) {
    this.state.accounts.get(id)!.email = email;
    this.state.revoked.push(id);
  }
  async challenge(id: string) {
    const c = this.state.challenges.get(id);
    return c ? structuredClone(c) : null;
  }
  async saveChallenge(c: AuthChallenge) {
    this.state.challenges.set(c.id, structuredClone(c));
  }
  async invalidate(email: string, purpose: AuthPurpose) {
    for (const c of this.state.challenges.values())
      if (c.email === email && c.purpose === purpose)
        c.consumedAt = new Date().toISOString();
  }
  async budget(key: string, since: Date) {
    const events = this.state.events.filter(
      (e) => e.key === key && e.at > since,
    );
    return {
      count: events.length,
      firstAt: events[0]?.at || null,
      lastAt: events.at(-1)?.at || null,
    };
  }
  async spend(key: string, at: Date) {
    this.state.events.push({ key, at });
  }
  async resetBudget(key: string) {
    this.state.events = this.state.events.filter((e) => e.key !== key);
  }
  async enqueue(mail: AuthMail) {
    this.state.mails.push(mail);
  }
  async claimMail(now: Date) {
    const m = this.state.mails.find(
      (m) => m.status === "QUEUED" && (!m.retryAt || m.retryAt <= now),
    );
    if (!m) return null;
    m.status = "PROCESSING";
    m.attempts++;
    return { ...m };
  }
  async finishMail(id: string, status: string, retryAt?: Date) {
    const m = this.state.mails.find((m) => m.id === id)!;
    m.status = status;
    m.retryAt = retryAt;
  }
  async listReviews() {
    return this.state.reviews.filter((r) => r.status === "PENDING_REVIEW");
  }
  async decideReview(
    id: string,
    approved: boolean,
    _actorId: string,
    note: string,
  ) {
    const review = this.state.reviews.find((r) => r.id === id)!;
    if (review.status !== "PENDING_REVIEW")
      throw new ConflictError("Already reviewed");
    review.status = approved ? "APPROVED" : "REJECTED";
    review.reviewNote = note;
    const u = this.state.accounts.get(review.userId)!;
    u.registrationStatus = review.status;
    if (approved) {
      u.status = "ACTIVE";
      this.state.roles.set(u.id, "TEACHER");
    }
    return u;
  }
  async audit(action: string) {
    this.state.audit.push(action);
  }
  async cleanup(_now: Date) {}
}
