import { OAuth2Client } from "google-auth-library";
import type {
  GoogleIdentity,
  IGoogleIdentityVerifier,
} from "../../application/ports/IAuthDelivery";
import { UnauthorizedError } from "../../shared/errors/AppError";

export class GoogleIdentityVerifier implements IGoogleIdentityVerifier {
  constructor(private readonly clientId: string) {}
  async verify(credential: string): Promise<GoogleIdentity> {
    try {
      // An empty audience must never turn into accepting tokens for any client.
      if (!this.clientId.trim()) throw new Error("Google client is disabled");
      const ticket = await new OAuth2Client(this.clientId).verifyIdToken({
        idToken: credential,
        audience: this.clientId,
      });
      const p = ticket.getPayload();
      if (
        !p?.sub ||
        !p.email ||
        p.email_verified !== true ||
        typeof p.nonce !== "string"
      )
        throw new Error("Unverified Google identity");
      return {
        sub: p.sub,
        email: p.email.trim().toLowerCase(),
        name: p.name || "",
        nonce: p.nonce,
        hostedDomain: p.hd?.toLowerCase(),
      };
    } catch {
      throw new UnauthorizedError(
        "Không xác minh được tài khoản Google. Vui lòng thử lại.",
        "GOOGLE_INVALID",
      );
    }
  }
}
