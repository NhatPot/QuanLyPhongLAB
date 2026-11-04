"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  selfAuthApi,
  type OtpChallenge,
  type VerificationGrant,
} from "@/services/self-service-auth-api";
import { useAuth } from "./AuthContext";
import { AuthCard, AuthField, authError } from "./AuthFields";
import styles from "./auth-pages.module.css";
export function ChangeEmailFlow() {
  const { user, isLoading, isAuthenticated, acceptSession } = useAuth(),
    router = useRouter();
  const [step, setStep] = useState<
    "start" | "old-otp" | "new-email" | "new-otp" | "confirm" | "done"
  >("start");
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null),
    [proof, setProof] = useState<VerificationGrant | null>(null);
  const [code, setCode] = useState(""),
    [email, setEmail] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [clock, setClock] = useState(Date.now());
  useEffect(() => {
    if (!isLoading && !isAuthenticated && step !== "done")
      router.replace("/login?from=/change-email");
  }, [isLoading, isAuthenticated, router, step]);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (step === "start") {
        setChallenge(await selfAuthApi.requestCurrentEmail());
        setStep("old-otp");
      } else if (step === "old-otp") {
        setProof(
          await selfAuthApi.verifyCurrentEmail(challenge!.challengeId, code),
        );
        setStep("new-email");
      } else if (step === "new-email") {
        setChallenge(await selfAuthApi.requestNewEmail(proof!, email));
        setProof(null);
        setStep("new-otp");
      } else if (step === "new-otp") {
        setProof(
          await selfAuthApi.verifyNewEmail(challenge!.challengeId, code),
        );
        setStep("confirm");
      } else if (step === "confirm") {
        await selfAuthApi.changeEmail(proof!);
        setProof(null);
        setStep("done");
        await acceptSession();
      }
      setCode("");
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy(false);
    }
  }
  const otp = step === "old-otp" || step === "new-otp";
  const wait = challenge
    ? Math.max(0, Math.ceil((Date.parse(challenge.resendAt) - clock) / 1000))
    : 0;
  async function resend() {
    if (!challenge) return;
    setBusy(true);
    setError("");
    try {
      setChallenge(await selfAuthApi.resend(challenge.challengeId));
      setCode("");
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthCard
      title={step === "done" ? "Email đã cập nhật" : "Đổi email tài khoản"}
      description={
        step === "start" ? (
          <>
            Xác minh email hiện tại <strong>{user?.email}</strong> trước khi đổi
            sang email mới.
          </>
        ) : otp ? (
          <>
            Nhập mã được gửi tới <strong>{challenge?.email}</strong>.
          </>
        ) : step === "new-email" ? (
          "Nhập email mới cùng loại tài khoản sinh viên hoặc giảng viên."
        ) : step === "confirm" ? (
          <>
            Email mới <strong>{email}</strong> đã được xác minh. Xác nhận để cập
            nhật và đăng xuất các phiên cũ.
          </>
        ) : (
          "Vui lòng đăng nhập lại bằng thông tin tài khoản của bạn."
        )
      }
    >
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {step === "done" ? (
        <Link className={styles.primary} href="/login">
          Về trang đăng nhập
        </Link>
      ) : (
        <form className={styles.form} onSubmit={submit}>
          {step === "new-email" && (
            <AuthField
              id="new-email"
              label="Email mới"
              placeholder="Email mới"
              type="email"
              autoComplete="email"
              required
              maxLength={255}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
          {otp && (
            <div className={`${styles.field} ${styles.otp}`}>
              <label className={styles.srOnly} htmlFor="change-email-otp">
                Mã xác minh 6 chữ số
              </label>
              <input
                id="change-email-otp"
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          )}
          <button
            className={styles.primary}
            type="submit"
            disabled={busy || isLoading}
          >
            {busy
              ? "Đang xử lý…"
              : step === "start"
                ? "Gửi mã đến email hiện tại"
                : otp
                  ? "Xác minh mã OTP"
                  : step === "new-email"
                    ? "Gửi mã đến email mới"
                    : "Xác nhận đổi email"}
          </button>
        </form>
      )}
      {otp && challenge && (
        <div className={styles.resendRow}>
          <button
            className={`${styles.link} ${styles.resend}`}
            type="button"
            disabled={busy || wait > 0 || challenge.resendsRemaining === 0}
            onClick={resend}
          >
            {wait ? `Gửi lại sau ${wait}s` : "Gửi lại mã OTP"}
          </button>
          <span className={styles.hint}>
            Còn {challenge.resendsRemaining}/5 lượt
          </span>
        </div>
      )}
      {step !== "done" && (
        <div className={styles.footer}>
          <Link className={styles.link} href="/profile">
            Quay lại hồ sơ
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
