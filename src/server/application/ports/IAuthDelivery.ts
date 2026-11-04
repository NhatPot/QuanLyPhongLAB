import type { AuthPurpose } from "./ISelfServiceAuthStore";
export type AuthMailPayload =
  | {
      kind: "otp";
      email: string;
      purpose: AuthPurpose;
      code: string;
      expiresAt: string;
    }
  | { kind: "notice"; email: string; text: string };
export interface IAuthDelivery {
  encrypt(payload: AuthMailPayload): string;
  send(ciphertext: string): Promise<void>;
  verify?(): Promise<void>;
}
export interface GoogleIdentity {
  sub: string;
  email: string;
  name: string;
  nonce: string;
  hostedDomain?: string;
}
export interface IGoogleIdentityVerifier {
  verify(credential: string): Promise<GoogleIdentity>;
}
