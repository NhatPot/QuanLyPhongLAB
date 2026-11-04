export interface SsoIdentity {
  issuer: string;
  subject: string;
  email: string;
  emailVerified: boolean;
  name: string;
  idToken: string;
  expiresAt: string;
}
export interface SsoAuthorization {
  state: string;
  nonce: string;
  verifier: string;
  redirectUri: string;
}
export interface IFitSsoProvider {
  authorizationUrl(flow: SsoAuthorization): Promise<string>;
  exchange(url: URL, flow: SsoAuthorization): Promise<SsoIdentity>;
  logoutUrl(origin: string, idToken?: string): Promise<string>;
}
