"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, UserRound } from "lucide-react";
import {
  selfAuthApi,
  type AuthOutcome,
  type OtpChallenge,
  type VerificationGrant,
} from "@/services/self-service-auth-api";
import { useAuth } from "./AuthContext";
import { AuthCard, AuthField, AuthPassword, authError } from "./AuthFields";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { AccountDetailsFields } from "./AccountDetailsFields";
import { FitSsoSignIn } from "./FitSsoSignIn";
import styles from "./auth-pages.module.css";

export function AuthFlow({
  mode,
  initialChallenge,
  initialGrant,
}: {
  mode: "register" | "reset" | "set-password";
  initialChallenge?: OtpChallenge;
  initialGrant?: VerificationGrant;
}) {
  const router = useRouter(),
    { acceptSession, user, isLoading, isAuthenticated } = useAuth();
  const [email, setEmail] = useState(
    initialChallenge?.email || initialGrant?.email || "",
  );
  const [challenge, setChallenge] = useState<OtpChallenge | null>(
    initialChallenge || null,
  );
  const [grant, setGrant] = useState<VerificationGrant | null>(
    initialGrant || null,
  );
  const [code, setCode] = useState(""),
    [fullName, setFullName] = useState(initialGrant?.fullName || "");
  const [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState("");
  const [department, setDepartment] = useState(""),
    [phone, setPhone] = useState("");
  const submitting = useRef(false);
  const [ssoEnabled, setSsoEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    selfAuthApi
      .config()
      .then((c) => setSsoEnabled(!!c.ssoEnabled))
      .catch((e) => setError(authError(e)));
  }, []);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const registration = mode === "register",
    key = `auth.${mode}.challenge`;
  useEffect(() => {
    if (mode === "set-password") {
      if (user?.email) setEmail(user.email);
      if (!isLoading && !isAuthenticated && !done)
        router.replace("/login?from=/set-password");
    }
  }, [mode, user?.email, isLoading, isAuthenticated, done, router]);
  useEffect(() => {
    if (challenge || grant || done)
      document
        .querySelector<HTMLElement>("[data-auth-title]")
        ?.focus({ preventScroll: true });
  }, [challenge?.challengeId, grant?.challengeId, done]);
  useEffect(() => {
    if (!initialChallenge && !initialGrant) {
      try {
        const saved = JSON.parse(sessionStorage.getItem(key) || "null");
        if (
          saved?.challengeId &&
          typeof saved.email === "string" &&
          Date.parse(saved.expiresAt) > Date.now() - 3600000
        ) {
          setChallenge(saved);
          setEmail(saved.email);
        }
      } catch {
        /* Storage is optional. */
      }
    }
    const interval = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [key, initialChallenge, initialGrant]);
  function saveChallenge(value: OtpChallenge) {
    setChallenge(value);
    setEmail(value.email);
    setCode("");
    setGrant(null);
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* Cookie binding is enforced server-side. */
    }
  }
  function clear() {
    try {
      sessionStorage.removeItem(key);
    } catch {}
  }
  async function outcome(value: AuthOutcome) {
    if (value.state === "active") {
      clear();
      const profile = await acceptSession();
      router.replace(
        profile?.requiresAccountSetup
          ? "/complete-account"
          : profile?.mustChangePassword
            ? "/change-password"
            : "/",
      );
    } else if (value.state === "pending_review") {
      clear();
      router.push("/registration-status");
    } else if (value.state === "verify_email") saveChallenge(value);
    else {
      clear();
      setGrant(value);
      setEmail(value.email);
      setFullName(value.fullName);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setError("");
    setBusy(true);
    try {
      if (grant) {
        if (
          registration &&
          grant.requiresPassword &&
          (!department.trim() || !phone.trim())
        )
          throw new Error("Vui lòng nhập ngành / phòng ban và số điện thoại.");
        if (grant.requiresPassword || !registration) {
          if (password !== confirm)
            throw new Error("Mật khẩu xác nhận không khớp.");
          if (
            password.length < 12 ||
            new TextEncoder().encode(password).length > 72
          )
            throw new Error(
              "Mật khẩu cần ít nhất 12 ký tự và không quá 72 byte UTF-8.",
            );
        }
        if (registration)
          await outcome(
            await selfAuthApi.complete({
              ...grant,
              fullName,
              password: grant.requiresPassword ? password : undefined,
              department: grant.requiresPassword ? department : undefined,
              phone: grant.requiresPassword ? phone : undefined,
            }),
          );
        else {
          await selfAuthApi.reset(
            { ...grant, password },
            mode === "set-password",
          );
          clear();
          setPassword("");
          setConfirm("");
          setGrant(null);
          setDone(true);
          await acceptSession();
        }
      } else if (challenge) {
        const result = await selfAuthApi.verify(
          challenge.challengeId,
          code,
          mode,
        );
        clear();
        // Keep the one-time proof available for retry if account creation fails
        // after OTP verification succeeds.
        setGrant(result);
        setFullName(result.fullName);
        setCode("");
        // Google owns the verified email. Continue to the same account-details
        // form via its restricted session instead of asking for a password here.
        if (
          registration &&
          !result.requiresPassword &&
          result.fullName.trim().length >= 2
        ) {
          await outcome(
            await selfAuthApi.complete({
              ...result,
              fullName: result.fullName,
            }),
          );
          return;
        }
      } else saveChallenge(await selfAuthApi.requestCode(email.trim(), mode));
    } catch (e) {
      setError(
        e instanceof Error && !("response" in e) ? e.message : authError(e),
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  async function resend() {
    if (!challenge) return;
    setError("");
    setBusy(true);
    try {
      saveChallenge(await selfAuthApi.resend(challenge.challengeId));
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy(false);
    }
  }
  const wait = challenge
    ? Math.max(0, Math.ceil((Date.parse(challenge.resendAt) - clock) / 1000))
    : 0;
  const seconds = challenge
    ? Math.max(0, Math.ceil((Date.parse(challenge.expiresAt) - clock) / 1000))
    : 0;
  const title = done
    ? "Mật khẩu đã cập nhật"
    : grant
      ? registration
        ? grant.requiresPassword
          ? "Đăng ký tài khoản"
          : "Xác nhận họ tên"
        : "Đặt mật khẩu mới"
      : challenge
        ? "Xác minh email"
        : registration
          ? "Tạo tài khoản"
          : mode === "set-password"
            ? "Thiết lập mật khẩu"
            : "Quên mật khẩu";
  const description = done ? (
    "Bạn có thể đăng nhập bằng mật khẩu mới."
  ) : grant ? (
    registration ? (
      grant.requiresPassword ? null : (
        "Nhập họ tên để tiếp tục bằng tài khoản Google đã xác minh."
      )
    ) : (
      "Chọn mật khẩu mới để bảo vệ tài khoản."
    )
  ) : challenge ? (
    <>
      Nếu email đủ điều kiện, mã xác minh sẽ được gửi tới{" "}
      <strong>{email}</strong>.
    </>
  ) : registration ? (
    "Sử dụng email trường để bắt đầu."
  ) : (
    "Nhập email tài khoản để nhận mã xác minh."
  );
  if (ssoEnabled === null)
    return (
      <AuthCard
        title={registration ? "Đăng ký tài khoản" : "Quản lý tài khoản"}
      >
        <p
          className={error ? styles.error : styles.hint}
          role={error ? "alert" : "status"}
        >
          {error || "Đang tải phương thức xác thực…"}
        </p>
      </AuthCard>
    );
  if (ssoEnabled)
    return (
      <AuthCard
        title={registration ? "Đăng ký tài khoản" : "Quản lý tài khoản SSO"}
      >
        <FitSsoSignIn
          label={
            registration
              ? "Tiếp tục đăng ký qua FIT LHU SSO"
              : "Tiếp tục tới FIT LHU SSO"
          }
        />
        <p className={styles.hint}>
          Đăng ký, xác minh email và khôi phục mật khẩu được thực hiện tại FIT
          LHU SSO.
        </p>
        <div className={styles.footer}>
          <Link href="/login" className={styles.link}>
            Về đăng nhập
          </Link>
        </div>
      </AuthCard>
    );
  return (
    <AuthCard title={title} description={description}>
      {registration && !done && (
        <div className={styles.steps} aria-label="Tiến trình đăng ký">
          <span aria-current={!challenge && !grant ? "step" : undefined}>
            <b>1</b>Email
          </span>
          <span aria-current={challenge && !grant ? "step" : undefined}>
            <b>2</b>Xác minh
          </span>
          <span aria-current={grant ? "step" : undefined}>
            <b>3</b>Đăng ký
          </span>
        </div>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {done ? (
        <>
          <div className={styles.statusIcon}>
            <Check size={28} />
          </div>
          <Link className={styles.primary} href="/login">
            Về trang đăng nhập
          </Link>
        </>
      ) : (
        <>
          <form className={styles.form} onSubmit={submit}>
            {!challenge && !grant && (
              <AuthField
                id="auth-email"
                label="Email tài khoản"
                type="email"
                placeholder={
                  registration
                    ? "Email sinh viên hoặc giảng viên"
                    : "Email tài khoản của bạn"
                }
                autoComplete="email"
                required
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={mode === "set-password"}
                disabled={busy}
              />
            )}
            {challenge && !grant && (
              <>
                <div className={`${styles.field} ${styles.otp}`}>
                  <label htmlFor="otp-code" className={styles.srOnly}>
                    Mã xác minh 6 chữ số
                  </label>
                  <input
                    id="otp-code"
                    type="text"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="000000"
                    required
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    disabled={busy}
                  />
                </div>
                <p className={styles.hint} aria-live="off">
                  {seconds
                    ? `Mã còn hiệu lực ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}. Kiểm tra cả mục thư rác.`
                    : "Mã đã hết hạn. Vui lòng yêu cầu mã mới."}
                </p>
              </>
            )}
            {grant && registration && grant.requiresPassword && (
              <AccountDetailsFields
                email={email}
                prefix="registration"
                values={{
                  fullName,
                  department,
                  phone,
                  password,
                  confirmPassword: confirm,
                }}
                onChange={(field, value) =>
                  ({
                    fullName: setFullName,
                    department: setDepartment,
                    phone: setPhone,
                    password: setPassword,
                    confirmPassword: setConfirm,
                  })[field](value)
                }
                busy={busy}
              />
            )}
            {grant && registration && !grant.requiresPassword && (
              <AuthField
                id="full-name"
                label="Họ và tên"
                icon={<UserRound size={17} />}
                placeholder="Họ và tên"
                autoComplete="name"
                required
                minLength={2}
                maxLength={255}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={busy}
              />
            )}
            {grant && !registration && (
              <>
                <AuthPassword
                  id="new-password"
                  label="Mật khẩu mới"
                  placeholder="Mật khẩu mới"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={72}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                />
                <AuthPassword
                  id="confirm-password"
                  label="Xác nhận mật khẩu"
                  placeholder="Xác nhận mật khẩu"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={72}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={busy}
                />
                <p className={styles.hint}>
                  Ít nhất 12 ký tự. Bạn có thể dùng một cụm từ dễ nhớ.
                </p>
              </>
            )}
            <button className={styles.primary} type="submit" disabled={busy}>
              {busy
                ? "Đang xử lý…"
                : grant
                  ? registration
                    ? grant.requiresPassword
                      ? "Hoàn tất tài khoản"
                      : "Tiếp tục"
                    : "Cập nhật mật khẩu"
                  : challenge
                    ? "Xác minh mã OTP"
                    : "Gửi mã OTP"}
            </button>
          </form>
          {challenge && !grant && (
            <div className={styles.resendRow}>
              <button
                type="button"
                className={`${styles.link} ${styles.resend}`}
                disabled={busy || wait > 0 || challenge.resendsRemaining <= 0}
                onClick={resend}
              >
                {wait
                  ? `Gửi lại sau ${wait}s`
                  : challenge.resendsRemaining <= 0
                    ? "Đã hết lượt gửi lại"
                    : "Gửi lại mã OTP"}
              </button>
              <span className={styles.hint}>
                Còn {challenge.resendsRemaining}/5 lượt gửi lại
              </span>
            </div>
          )}
          {!challenge && !grant && registration && (
            <>
              <div className={styles.separator}>hoặc</div>
              <GoogleSignInButton onResult={outcome} onError={setError} />
            </>
          )}
        </>
      )}
      {!done && (
        <div className={styles.footer}>
          {challenge || grant ? (
            <button
              type="button"
              className={`${styles.link} ${styles.resend} ${styles.back}`}
              onClick={() => {
                clear();
                setChallenge(null);
                setGrant(null);
                setCode("");
                setPassword("");
                setConfirm("");
                setDepartment("");
                setPhone("");
                setError("");
              }}
            >
              <ArrowLeft size={14} />
              Nhập lại email
            </button>
          ) : (
            <Link
              className={`${styles.link} ${styles.back}`}
              href={mode === "set-password" ? "/profile" : "/login"}
            >
              <ArrowLeft size={14} />
              {mode === "set-password"
                ? "Quay lại hồ sơ"
                : "Quay lại đăng nhập"}
            </Link>
          )}
        </div>
      )}
    </AuthCard>
  );
}
