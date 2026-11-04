import { SelfServiceAuth } from "../application/use-cases/auth/SelfServiceAuth";
import { SqlSelfServiceAuthStore } from "../infrastructure/database/sqlserver/repositories/SqlSelfServiceAuthStore";
import { SmtpAuthDelivery } from "../infrastructure/email/SmtpAuthDelivery";
import { GoogleIdentityVerifier } from "../infrastructure/auth/GoogleIdentityVerifier";
import { BcryptHasher } from "../infrastructure/auth/BcryptHasher";
import { readSelfServiceConfig } from "../infrastructure/auth/self-service-config";

export function selfServiceAuth() {
  const config = readSelfServiceConfig();
  return new SelfServiceAuth(
    config,
    new SqlSelfServiceAuthStore(),
    new SmtpAuthDelivery(config.outboxKey),
    new BcryptHasher(),
    new GoogleIdentityVerifier(config.googleClientId),
  );
}
