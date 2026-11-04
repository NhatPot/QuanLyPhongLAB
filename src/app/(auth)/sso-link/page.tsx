"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthCard, AuthPassword, authError } from "@/features/auth/AuthFields";
import { GoogleSignInButton } from "@/features/auth/GoogleSignInButton";
import { fitSsoApi } from "@/services/fit-sso-api";
import styles from "@/features/auth/auth-pages.module.css";
export default function SsoLinkPage() {
  const [info, setInfo] = useState<Awaited<
      ReturnType<typeof fitSsoApi.pending>
    > | null>(null),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    fitSsoApi
      .pending()
      .then(setInfo)
      .catch((e) => setError(authError(e)));
  }, []);
  async function link(input: Parameters<typeof fitSsoApi.link>[0]) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await fitSsoApi.link(input);
      window.location.assign(result.redirectTo);
    } catch (e) {
      setError(authError(e));
      pending.current = false;
      setBusy(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    await link({ password });
  }
  return (
    <AuthCard
      title="Liên kết tài khoản Lab"
      description="Xác nhận tài khoản Lab cũ để giữ nguyên dữ liệu và quyền khi dùng SSO."
    >
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {info ? (
        <>
          <p className={styles.hint}>
            SSO đã xác minh <strong>{info.email}</strong>. Email này đã có tài
            khoản Lab.
          </p>
          {info.hasPassword && (
            <form className={styles.form} onSubmit={submit}>
              <AuthPassword
                id="sso-link-password"
                label="Mật khẩu Lab hiện tại"
                showLabel
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
              <button type="submit" className={styles.primary} disabled={busy}>
                {busy ? "Đang liên kết…" : "Xác nhận và liên kết SSO"}
              </button>
            </form>
          )}
          {info.googleLinked && (
            <div className="mt-5">
              <GoogleSignInButton
                onError={setError}
                onCredential={async (credential, challengeId) => {
                  const result = await fitSsoApi.link({
                    googleCredential: credential,
                    googleChallengeId: challengeId,
                  });
                  window.location.assign(result.redirectTo);
                }}
              />
            </div>
          )}
          {!info.hasPassword && !info.googleLinked && (
            <p className={styles.hint}>
              Vui lòng liên hệ quản trị viên để xác nhận tài khoản cũ.
            </p>
          )}
        </>
      ) : (
        !error && <p className={styles.hint}>Đang kiểm tra tài khoản…</p>
      )}
      <div className={styles.footer}>
        <Link className={styles.link} href="/login">
          Về đăng nhập
        </Link>
      </div>
    </AuthCard>
  );
}
