export type AuthPurpose =
  | "REGISTER"
  | "RESET_PASSWORD"
  | "GOOGLE"
  | "LINK_GOOGLE"
  | "SET_PASSWORD"
  | "CHANGE_EMAIL"
  | "CHANGE_EMAIL_NEW"
  | "SSO_FLOW"
  | "SSO_LINK"
  | "SSO_SESSION"
  | "SSO_LOGOUT";
export type AccountRole = "STUDENT" | "TEACHER";
export interface AuthAccount {
  id: string;
  email: string;
  fullName: string;
  username: string;
  passwordHash: string | null;
  status: string;
  deletedAt: Date | null;
  emailVerifiedAt: Date | null;
  registrationStatus?: string | null;
  department?: string | null;
  phone?: string | null;
  ssoLinked?: boolean;
}
export interface AccountSetupProfile {
  fullName: string;
  department: string;
  phone: string;
}
export interface AuthChallenge {
  id: string;
  email: string;
  purpose: AuthPurpose;
  binding: string;
  codeHash: string;
  expiresAt: string;
  createdAt: string;
  userId?: string;
  googleSub?: string;
  fullName?: string;
  originalEmail?: string;
  verifiedAt?: string;
  consumedAt?: string;
  grantHash?: string;
  grantExpiresAt?: string;
  eligible: boolean;
  encryptedPayload?: string;
}
export interface AuthMail {
  id: string;
  challengeId: string | null;
  ciphertext: string;
  expiresAt: Date;
  attempts: number;
  status: string;
}
export interface RegistrationReview {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  status: string;
  submittedAt: string;
  reviewNote: string | null;
}
export interface AuthBudget {
  count: number;
  lastAt: Date | null;
  firstAt: Date | null;
}
export interface SelfServiceTransaction {
  account(email: string): Promise<AuthAccount | null>;
  accountById(id: string): Promise<AuthAccount | null>;
  accountByGoogle(sub: string): Promise<AuthAccount | null>;
  googleLinked(userId: string): Promise<boolean>;
  accountBySso(issuer: string, subject: string): Promise<AuthAccount | null>;
  linkSso(userId: string, issuer: string, subject: string, email: string): Promise<void>;
  completeSsoProfile(userId: string, profile: AccountSetupProfile): Promise<void>;
  createAccount(
    account: AuthAccount,
    role: AccountRole,
    googleSub?: string,
  ): Promise<void>;
  linkGoogle(userId: string, sub: string, email: string): Promise<void>;
  setPassword(userId: string, hash: string): Promise<void>;
  completeAccountSetup(userId: string, profile: AccountSetupProfile, hash: string): Promise<void>;
  changeEmail(userId: string, email: string): Promise<void>;
  challenge(id: string): Promise<AuthChallenge | null>;
  saveChallenge(challenge: AuthChallenge): Promise<void>;
  invalidate(email: string, purpose: AuthPurpose): Promise<void>;
  budget(key: string, since: Date): Promise<AuthBudget>;
  spend(key: string, at: Date): Promise<void>;
  resetBudget(key: string): Promise<void>;
  enqueue(mail: AuthMail): Promise<void>;
  claimMail(now: Date): Promise<AuthMail | null>;
  finishMail(id: string, status: string, retryAt?: Date): Promise<void>;
  listReviews(): Promise<RegistrationReview[]>;
  decideReview(
    id: string,
    approved: boolean,
    actorId: string,
    note: string,
  ): Promise<AuthAccount>;
  audit(action: string, userId?: string, entityId?: string): Promise<void>;
  cleanup(now: Date): Promise<void>;
}
export interface ISelfServiceAuthStore {
  transaction<T>(work: (tx: SelfServiceTransaction) => Promise<T>): Promise<T>;
}
