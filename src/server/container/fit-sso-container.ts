import { FitSsoAuth } from "../application/use-cases/auth/FitSsoAuth";
import { SqlSelfServiceAuthStore } from "../infrastructure/database/sqlserver/repositories/SqlSelfServiceAuthStore";
import { FitSsoProvider } from "../infrastructure/auth/FitSsoProvider";
import { readFitSsoConfig } from "../infrastructure/auth/fit-sso-config";
import { readSelfServiceConfig } from "../infrastructure/auth/self-service-config";
import { BcryptHasher } from "../infrastructure/auth/BcryptHasher";
import { GoogleIdentityVerifier } from "../infrastructure/auth/GoogleIdentityVerifier";
export function fitSsoAuth() {
  const config = readFitSsoConfig(),
    legacy = readSelfServiceConfig();
  return new FitSsoAuth(
    config,
    new SqlSelfServiceAuthStore(),
    new FitSsoProvider(config),
    new BcryptHasher(),
    new GoogleIdentityVerifier(legacy.googleClientId),
    legacy,
    legacy.secret,
  );
}
