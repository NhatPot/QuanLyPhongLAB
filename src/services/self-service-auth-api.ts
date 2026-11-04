import { apiClient } from "./api-client";
export interface AuthFeatureConfig {
  ssoEnabled?: boolean;
  ssoAccountUrl?: string;
  legacyGoogleLinkEnabled?: boolean;
  registrationEnabled: boolean;
  googleEnabled: boolean;
  passwordResetEnabled: boolean;
  googleClientId: string;
  studentDomains: string[];
  teacherDomains: string[];
}
export interface OtpChallenge {
  challengeId: string;
  email: string;
  expiresAt: string;
  resendAt: string;
  resendsRemaining: number;
}
export interface VerificationGrant {
  challengeId: string;
  grant: string;
  email: string;
  requiresPassword: boolean;
  fullName: string;
}
export type AuthOutcome =
  | { state: "active"; csrfToken?: string; mustChangePassword?: boolean; requiresAccountSetup?: boolean }
  | { state: "pending_review" }
  | ({ state: "verify_email" } & OtpChallenge)
  | ({ state: "complete_profile" } & VerificationGrant);
async function post<T>(path: string, data: unknown = {}): Promise<T> {
  return (await apiClient.post("/auth/" + path, data)).data.data;
}
export const selfAuthApi = {
  accountSetup: (payload: {fullName: string; department: string; phone: string; password: string; confirmPassword: string}) =>
    post<{state: string}>('account-setup', payload),
  config: async (): Promise<AuthFeatureConfig> =>
    (await apiClient.get("/auth/config")).data.data,
  requestCode: (email: string, mode: "register" | "reset" | "set-password") =>
    post<OtpChallenge>(
      mode === "register"
        ? "register/request-code"
        : mode === "reset"
          ? "password/request-reset"
          : "me/password/request-code",
      { email },
    ),
  resend: (challengeId: string) =>
    post<OtpChallenge>("otp/resend", { challengeId }),
  verify: (
    challengeId: string,
    code: string,
    mode: "register" | "reset" | "set-password",
  ) =>
    post<VerificationGrant>(
      mode === "register"
        ? "register/verify-code"
        : mode === "reset"
          ? "password/verify-reset"
          : "me/password/verify-code",
      { challengeId, code },
    ),
  complete: (
    payload: VerificationGrant & { fullName: string; password?: string; department?: string; phone?: string },
  ) =>
    post<AuthOutcome>("register/complete", {
      challengeId: payload.challengeId,
      grant: payload.grant,
      fullName: payload.fullName,
      password: payload.password,
      department: payload.department,
      phone: payload.phone,
    }),
  reset: (payload: VerificationGrant & { password: string }, setting = false) =>
    post<{ state: string }>(setting ? "me/password/set" : "password/reset", {
      challengeId: payload.challengeId,
      grant: payload.grant,
      password: payload.password,
    }),
  nonce: () =>
    post<{ nonce: string; challengeId: string; clientId: string; expiresAt: string }>(
      "google/nonce",
    ),
  google: (credential: string, challengeId: string) =>
    post<AuthOutcome>("google", { credential, challengeId }),
  linkGoogle: (credential: string, challengeId: string, password?: string) =>
    post<{ state: "linked" }>("me/google/link", {
      credential,
      challengeId,
      password,
    }),
  requestCurrentEmail: () => post<OtpChallenge>("me/email/request-code"),
  verifyCurrentEmail: (challengeId: string, code: string) =>
    post<VerificationGrant>("me/email/verify-current", { challengeId, code }),
  requestNewEmail: (proof: VerificationGrant, email: string) =>
    post<OtpChallenge>("me/email/request-new", {
      challengeId: proof.challengeId,
      grant: proof.grant,
      email,
    }),
  verifyNewEmail: (challengeId: string, code: string) =>
    post<VerificationGrant>("me/email/verify-code", { challengeId, code }),
  changeEmail: (proof: VerificationGrant) =>
    post<{ state: string }>("me/email/change", {
      challengeId: proof.challengeId,
      grant: proof.grant,
    }),
};
