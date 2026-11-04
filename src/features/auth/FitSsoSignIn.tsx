"use client";
import { useRef, useState } from "react";
import { fitSsoApi } from "@/services/fit-sso-api";
import { authError } from "./AuthFields";
import styles from "./auth-pages.module.css";
export function FitSsoSignIn({
  returnTo = "/",
  label = "Đăng nhập bằng FIT LHU SSO",
}: {
  returnTo?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false);
  return (
    <>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className={styles.primary}
        disabled={busy}
        onClick={async () => {
          if (pending.current) return;
          pending.current = true;
          setBusy(true);
          setError("");
          try {
            const result = await fitSsoApi.start(returnTo);
            const url = new URL(result.authorizationUrl);
            if (url.origin !== "https://auth.fitlhu.com")
              throw new Error("Địa chỉ SSO không hợp lệ.");
            window.location.assign(url.href);
          } catch (error) {
            setError(authError(error));
            pending.current = false;
            setBusy(false);
          }
        }}
      >
        {busy ? "Đang chuyển tới SSO…" : label}
      </button>
      <p className={styles.hint}>
        Dùng tài khoản trường, Google hoặc passkey tại FIT LHU SSO.
      </p>
    </>
  );
}
export const ssoErrorText = (code: string | null) =>
  !code
    ? ""
    : {
        SSO_CANCELLED: "Bạn chưa hoàn tất đăng nhập SSO. Vui lòng thử lại.",
        SSO_FLOW_INVALID:
          "Phiên SSO đã hết hạn hoặc không đúng trình duyệt. Vui lòng đăng nhập lại.",
        SSO_STATE_INVALID:
          "Phiên SSO không khớp. Vui lòng bắt đầu đăng nhập lại.",
        SSO_EMAIL_UNVERIFIED:
          "Hãy xác minh email tại FIT LHU SSO trước khi vào Lab.",
        ACCOUNT_DELETED:
          "Tài khoản Lab đã bị xóa. Vui lòng liên hệ quản trị viên.",
        ACCOUNT_LOCKED:
          "Tài khoản Lab đang bị khóa. Vui lòng liên hệ quản trị viên.",
        REGISTRATION_REJECTED:
          "Đăng ký giảng viên đã bị từ chối. Vui lòng liên hệ quản trị viên.",
        SSO_EMAIL_CHANGED:
          "Email SSO đã thay đổi. Vui lòng liên hệ quản trị viên để cập nhật tài khoản Lab.",
      }[code] ||
      "Chưa hoàn tất đăng nhập FIT LHU SSO. Vui lòng thử lại hoặc liên hệ quản trị viên.";
