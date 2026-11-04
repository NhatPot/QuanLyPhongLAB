import * as oidc from "openid-client";
import type {
  IFitSsoProvider,
  SsoAuthorization,
  SsoIdentity,
} from "../../application/ports/IFitSsoProvider";
import type { FitSsoConfig } from "./fit-sso-config";
import { UnauthorizedError } from "../../shared/errors/AppError";

let cached:
  | { key: string; expires: number; config: Promise<oidc.Configuration> }
  | undefined;
export class FitSsoProvider implements IFitSsoProvider {
  private testConfig?: Promise<oidc.Configuration>;
  constructor(
    private readonly settings: FitSsoConfig,
    private readonly customFetch?: oidc.CustomFetch,
  ) {}
  private config() {
    const c = this.settings,
      key = `${c.issuer}\0${c.clientId}\0${c.clientSecret}`;
    const discover = () =>
      oidc.discovery(
        new URL(c.issuer),
        c.clientId,
        { id_token_signed_response_alg: "RS256" },
        oidc.ClientSecretBasic(c.clientSecret),
        {
          timeout: 10,
          execute: [oidc.enableNonRepudiationChecks],
          ...(this.customFetch ? { [oidc.customFetch]: this.customFetch } : {}),
        },
      );
    if (this.customFetch) return (this.testConfig ||= discover());
    if (!cached || cached.key !== key || cached.expires < Date.now()) {
      const config = discover();
      cached = { key, expires: Date.now() + 3600000, config };
      config.catch(() => {
        if (cached?.config === config) cached = undefined;
      });
    }
    return cached.config;
  }
  async authorizationUrl(flow: SsoAuthorization) {
    return oidc.buildAuthorizationUrl(await this.config(), {
      response_type: "code",
      redirect_uri: flow.redirectUri,
      scope: "openid profile email",
      state: flow.state,
      nonce: flow.nonce,
      code_challenge: await oidc.calculatePKCECodeChallenge(flow.verifier),
      code_challenge_method: "S256",
    }).href;
  }
  async exchange(url: URL, flow: SsoAuthorization): Promise<SsoIdentity> {
    if (
      url.origin + url.pathname !== flow.redirectUri ||
      url.searchParams.get("iss") !== this.settings.issuer
    )
      throw new UnauthorizedError(
        "Phản hồi SSO không đúng ứng dụng.",
        "SSO_CALLBACK_INVALID",
      );
    const tokens = await oidc.authorizationCodeGrant(await this.config(), url, {
      expectedState: flow.state,
      expectedNonce: flow.nonce,
      pkceCodeVerifier: flow.verifier,
      idTokenExpected: true,
    });
    const claims = tokens.claims();
    if (
      !claims ||
      typeof claims.sub !== "string" ||
      !claims.sub ||
      typeof claims.email !== "string" ||
      claims.email_verified !== true ||
      !tokens.id_token ||
      typeof claims.exp !== "number"
    )
      throw new UnauthorizedError(
        "SSO chưa cung cấp email đã xác minh.",
        "SSO_EMAIL_UNVERIFIED",
      );
    return {
      issuer: this.settings.issuer,
      subject: claims.sub,
      email: claims.email.trim().toLowerCase(),
      emailVerified: true,
      name: typeof claims.name === "string" ? claims.name : "",
      idToken: tokens.id_token,
      expiresAt: new Date(claims.exp * 1000).toISOString(),
    };
  }
  async logoutUrl(origin: string, idToken?: string) {
    return oidc.buildEndSessionUrl(await this.config(), {
      post_logout_redirect_uri: origin + "/login",
      ...(idToken ? { id_token_hint: idToken } : {}),
    }).href;
  }
}
