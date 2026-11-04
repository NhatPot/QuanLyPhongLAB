import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync, sign } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { GoogleIdentityVerifier } from "./GoogleIdentityVerifier";

// Exercise the real Google library's JWT/signature/audience/issuer/time checks.
// Only its public-key fetch is replaced with a generated local RSA public key.
const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const clientId = "123456789-local-test.apps.googleusercontent.com";
const verifier = new GoogleIdentityVerifier(clientId);
function token(patch: Record<string, unknown> = {}, invalidSignature = false) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "test-key" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: "https://accounts.google.com", aud: clientId, iat: now - 10, exp: now + 3600,
    sub: "google-subject", email: " Student@Lachong.edu.vn ", email_verified: true,
    nonce: "server-nonce", hd: "LHU.EDU.VN", name: "Student Test", ...patch,
  })).toString("base64url");
  const content = `${header}.${payload}`;
  const signature = sign("RSA-SHA256", Buffer.from(content), keys.privateKey).toString("base64url");
  return `${content}.${invalidSignature ? "invalid-signature" : signature}`;
}
beforeEach(() => {
  vi.spyOn(OAuth2Client.prototype, "getFederatedSignonCertsAsync").mockResolvedValue({
    certs: { "test-key": keys.publicKey.export({ type: "spki", format: "pem" }).toString() },
    format: "PEM" as Awaited<ReturnType<OAuth2Client["getFederatedSignonCertsAsync"]>>["format"],
  });
});
afterEach(() => vi.restoreAllMocks());
describe("Google identity token verification", () => {
  it.each(["", "   "])("rejects tokens when the Google client configuration is removed: %j", async (client) => {
    await expect(new GoogleIdentityVerifier(client).verify(token())).rejects.toMatchObject({ code: "GOOGLE_INVALID" });
    expect(OAuth2Client.prototype.getFederatedSignonCertsAsync).not.toHaveBeenCalled();
  });
  it("accepts a valid signed token and normalizes email/hosted domain", async () => {
    expect(await verifier.verify(token())).toMatchObject({
      sub: "google-subject", email: "student@lachong.edu.vn", hostedDomain: "lhu.edu.vn", nonce: "server-nonce",
    });
  });
  it.each([
    { aud: "another-web-client" },
    { iss: "https://untrusted.example" },
    { exp: Math.floor(Date.now() / 1000) - 600 },
    { email_verified: false },
    { email: undefined },
    { sub: undefined },
    { nonce: undefined },
  ])("rejects invalid required identity claims: %j", async (patch) => {
    await expect(verifier.verify(token(patch))).rejects.toMatchObject({ code: "GOOGLE_INVALID", statusCode: 401 });
  });
  it("rejects a forged signature", async () => {
    await expect(verifier.verify(token({}, true))).rejects.toMatchObject({ code: "GOOGLE_INVALID" });
  });
  it("sanitizes public-key download failures", async () => {
    vi.mocked(OAuth2Client.prototype.getFederatedSignonCertsAsync).mockRejectedValue(new Error("private upstream details"));
    await expect(verifier.verify(token())).rejects.toMatchObject({ code: "GOOGLE_INVALID" });
    await expect(verifier.verify(token())).rejects.not.toThrow("private upstream details");
  });
});
