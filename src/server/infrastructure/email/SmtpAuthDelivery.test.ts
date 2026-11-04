import { afterEach, describe, expect, it, vi } from "vitest";
const { sendMail } = vi.hoisted(() => ({
  sendMail: vi.fn(async (_mail: Record<string, string>) => ({})),
}));
vi.mock("nodemailer", () => ({
  default: { createTransport: vi.fn(() => ({ sendMail })) },
}));
import { SmtpAuthDelivery } from "./SmtpAuthDelivery";
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
describe("encrypted auth email", () => {
  it("uses verification wording rather than registration copy when changing email or setting a password", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-03T05:00:00Z"));
    const sender = new SmtpAuthDelivery("a".repeat(64));
    await sender.send(
      sender.encrypt({
        kind: "otp",
        email: "new@lachong.edu.vn",
        purpose: "CHANGE_EMAIL_NEW",
        code: "482193",
        expiresAt: "2026-11-03T05:05:00Z",
      }),
    );
    const mail = sendMail.mock.calls[0][0];
    expect(mail.html).toContain("Xác minh tài khoản");
    expect(mail.text).not.toContain("đăng ký");
  });
  it("encrypts OTP at rest with unique nonces, and renders matching HTML/text without exposing OTP in the subject", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-03T05:00:00Z"));
    const sender = new SmtpAuthDelivery("a".repeat(64));
    const payload = {
      kind: "otp" as const,
      email: "123@lachong.edu.vn",
      purpose: "RESET_PASSWORD" as const,
      code: "482193",
      expiresAt: "2026-11-03T05:00:40Z",
    };
    const first = sender.encrypt(payload),
      second = sender.encrypt(payload);
    expect(first).not.toBe(second);
    expect(first).not.toContain("482193");
    await sender.send(first);
    const sent = sendMail.mock.calls[0][0];
    expect(sent.html).toContain("482193");
    expect(sent.text).toContain("482193");
    expect(sent.html).toContain("1 phút");
    expect(sent.text).toContain("1 phút");
    expect(sent.html).not.toContain("{{");
    expect(sent.subject).not.toContain("482193");
    expect(sent.html).toContain("Mật khẩu hiện tại của bạn chưa thay đổi");
  });
  it("rejects tampering and expired codes before SMTP", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-03T05:00:00Z"));
    const sender = new SmtpAuthDelivery("b".repeat(64));
    const cipher = sender.encrypt({
      kind: "otp",
      email: "123@lachong.edu.vn",
      purpose: "REGISTER",
      code: "482193",
      expiresAt: "2026-11-03T05:01:00Z",
    });
    const bytes = Buffer.from(cipher, "base64");
    bytes[30] ^= 1;
    await expect(sender.send(bytes.toString("base64"))).rejects.toBeTruthy();
    vi.setSystemTime(new Date("2026-11-03T05:02:00Z"));
    await expect(sender.send(cipher)).rejects.toThrow("EMAIL_EXPIRED");
    expect(sendMail).not.toHaveBeenCalled();
  });
});
