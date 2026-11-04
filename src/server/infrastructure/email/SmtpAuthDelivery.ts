import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import nodemailer from "nodemailer";
import type {
  AuthMailPayload,
  IAuthDelivery,
} from "../../application/ports/IAuthDelivery";

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

export class SmtpAuthDelivery implements IAuthDelivery {
  constructor(private readonly key: string) {}
  encrypt(payload: AuthMailPayload) {
    const iv = randomBytes(12);
    const cipher = createCipheriv(
      "aes-256-gcm",
      Buffer.from(this.key, "hex"),
      iv,
    );
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(payload), "utf8"),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
      "base64",
    );
  }
  async send(ciphertext: string) {
    const data = Buffer.from(ciphertext, "base64");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(this.key, "hex"),
      data.subarray(0, 12),
    );
    decipher.setAuthTag(data.subarray(12, 28));
    const payload: AuthMailPayload = JSON.parse(
      Buffer.concat([
        decipher.update(data.subarray(28)),
        decipher.final(),
      ]).toString("utf8"),
    );
    let subject: string, html: string, text: string;
    if (payload.kind === "otp") {
      const remaining = new Date(payload.expiresAt).getTime() - Date.now();
      if (remaining <= 0 || !/^\d{6}$/.test(payload.code))
        throw new Error("EMAIL_EXPIRED");
      const template =
        payload.purpose === "RESET_PASSWORD"
          ? "password-reset-otp"
          : "registration-otp";
      const folder = path.join(
        process.cwd(),
        "src/server/infrastructure/email/templates",
      );
      [html, text] = await Promise.all([
        readFile(path.join(folder, template + ".html"), "utf8"),
        readFile(path.join(folder, template + ".txt"), "utf8"),
      ]);
      if (
        payload.purpose !== "REGISTER" &&
        payload.purpose !== "RESET_PASSWORD"
      ) {
        const adapt = (value: string) =>
          value
            .replaceAll("Xác minh email đăng ký", "Xác minh tài khoản")
            .replaceAll(
              "Xác minh email để hoàn tất đăng ký tài khoản LHU IT LAB.",
              "Xác minh thao tác tài khoản LHU IT LAB.",
            )
            .replaceAll("MÃ XÁC MINH ĐĂNG KÝ", "MÃ XÁC MINH TÀI KHOẢN")
            .replaceAll(
              "Bạn vừa yêu cầu đăng ký tài khoản",
              "Bạn vừa yêu cầu xác minh tài khoản",
            )
            .replaceAll(
              "tại trang đăng ký để xác minh email và tiếp tục.",
              "tại trang tài khoản để xác minh thao tác và tiếp tục.",
            )
            .replaceAll(
              "Nếu bạn không yêu cầu đăng ký",
              "Nếu bạn không thực hiện yêu cầu",
            );
        html = adapt(html);
        text = adapt(text);
      }
      const vars = {
        otp: payload.code,
        expiresInMinutes: String(Math.ceil(remaining / 60000)),
        year: new Intl.DateTimeFormat("en", {
          year: "numeric",
          timeZone: "Asia/Bangkok",
        }).format(new Date()),
      };
      for (const [key, value] of Object.entries(vars)) {
        html = html.replaceAll("{{" + key + "}}", escapeHtml(value));
        text = text.replaceAll("{{" + key + "}}", value);
      }
      if (html.includes("{{") || text.includes("{{"))
        throw new Error("EMAIL_TEMPLATE_INVALID");
      subject =
        "[LHU IT LAB] " +
        (payload.purpose === "RESET_PASSWORD"
          ? "Xác minh đặt lại mật khẩu"
          : payload.purpose === "REGISTER"
            ? "Xác minh email đăng ký"
            : "Xác minh tài khoản");
    } else {
      subject = "[LHU IT LAB] Thông báo tài khoản";
      text = "LHU IT LAB\n\n" + payload.text;
      html = `<html lang="vi"><body style="margin:0;background:#f4f8fd;font:15px Arial,sans-serif;color:#334155"><table role="presentation" width="100%" cellpadding="24"><tr><td align="center"><table role="presentation" width="100%" style="max-width:600px"><tr><td style="padding:28px;background:#073761;color:#fff;font-size:24px;font-weight:bold">LHU IT LAB</td></tr><tr><td style="padding:28px;background:#fff;line-height:1.7">${escapeHtml(payload.text)}</td></tr></table></td></tr></table></body></html>`;
    }
    await this.transport().sendMail({
      from: process.env.MAIL_FROM,
      to: payload.email,
      subject,
      html,
      text,
    });
  }
  async verify() {
    await this.transport().verify();
  }
  private transport() {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: process.env.SMTP_SECURE !== "false",
      requireTLS: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }
}
