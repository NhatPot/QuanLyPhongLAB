"use client";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import {
  AuthCard,
  AuthField,
  AuthPassword,
  authError,
  safeAuthRedirect,
} from "@/features/auth/AuthFields";
import { GoogleSignInButton } from "@/features/auth/GoogleSignInButton";
import { AuthFlow } from "@/features/auth/AuthFlow";
import type { AuthOutcome } from "@/services/self-service-auth-api";
import styles from "@/features/auth/auth-pages.module.css";
import {
  selfAuthApi,
  type AuthFeatureConfig,
} from "@/services/self-service-auth-api";
import { FitSsoSignIn, ssoErrorText } from "@/features/auth/FitSsoSignIn";
function LoginForm() {
  const { login, user, isAuthenticated, isLoading, acceptSession } = useAuth();
  const router = useRouter(),
    params = useSearchParams();
  const [identifier, setIdentifier] = useState(""),
    [password, setPassword] = useState("");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [googleFlow, setGoogleFlow] = useState<AuthOutcome | null>(null);
  const [config, setConfig] = useState<AuthFeatureConfig | null>(null);
  const [configError, setConfigError] = useState("");
  useEffect(() => {
    selfAuthApi
      .config()
      .then(setConfig)
      .catch((e) => setConfigError(authError(e)));
  }, []);
  const adminLogin = params.get("local") === "admin";
  useEffect(() => {
    if (!isLoading && isAuthenticated)
      router.replace(
        user?.requiresAccountSetup
          ? "/complete-account"
          : user?.mustChangePassword
            ? "/change-password"
            : safeAuthRedirect(params.get("from")),
      );
  }, [
    isLoading,
    isAuthenticated,
    user?.mustChangePassword,
    user?.requiresAccountSetup,
    params,
    router,
  ]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const profile = await login({ identifier: identifier.trim(), password });
      router.replace(
        profile.requiresAccountSetup
          ? "/complete-account"
          : profile.mustChangePassword
            ? "/change-password"
            : safeAuthRedirect(params.get("from")),
      );
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy(false);
    }
  }
  async function google(result: AuthOutcome) {
    setError("");
    if (result.state === "active") {
      await acceptSession();
      router.replace(
        result.requiresAccountSetup
          ? "/complete-account"
          : result.mustChangePassword
            ? "/change-password"
            : safeAuthRedirect(params.get("from")),
      );
    } else if (result.state === "pending_review")
      router.push("/registration-status");
    else setGoogleFlow(result);
  }
  if (googleFlow?.state === "verify_email")
    return <AuthFlow mode="register" initialChallenge={googleFlow} />;
  if (googleFlow?.state === "complete_profile")
    return <AuthFlow mode="register" initialGrant={googleFlow} />;
  if (!config && !adminLogin)
    return (
      <AuthCard title="Đăng nhập">
        {configError ? (
          <p className={styles.error} role="alert">
            {configError}
          </p>
        ) : (
          <p className={styles.hint}>Đang tải phương thức đăng nhập…</p>
        )}
        <div className={styles.footer}>
          <Link className={styles.link} href="/login?local=admin">
            Tài khoản quản trị Lab
          </Link>
        </div>
      </AuthCard>
    );
  if (config?.ssoEnabled && !adminLogin)
    return (
      <AuthCard title="Đăng nhập">
        {ssoErrorText(params.get("sso_error")) && (
          <p className={styles.error} role="alert">
            {ssoErrorText(params.get("sso_error"))}
          </p>
        )}
        <FitSsoSignIn returnTo={safeAuthRedirect(params.get("from"))} />
        <div className={`${styles.footer} flex flex-col gap-3`}>
          <Link className={styles.link} href="/register">
            Đăng ký tài khoản SSO
          </Link>
          <Link className={styles.link} href="/login?local=admin">
            Tài khoản quản trị Lab
          </Link>
        </div>
      </AuthCard>
    );
  return (
    <AuthCard title="Đăng nhập">
      {params.get("setup") === "complete" && (
        <p role="status" className="mb-4 text-sm leading-6 text-emerald-700">
          Đã hoàn thiện tài khoản. Hãy đăng nhập bằng email trường và mật khẩu
          mới hoặc tiếp tục bằng Google.
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <form className={styles.form} onSubmit={submit}>
        <AuthField
          id="login-identifier"
          label="Email trường / Tài khoản admin"
          showLabel
          icon={<UserRound size={17} />}
          placeholder="Nhập email trường hoặc tài khoản admin"
          autoComplete="username"
          required
          maxLength={255}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          disabled={busy}
        />
        <AuthPassword
          id="login-password"
          showLabel
          placeholder="••••••••"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
        />
        {!config?.ssoEnabled && (
          <div className={styles.forgot}>
            <Link className={styles.link} href="/forgot-password">
              Quên mật khẩu?
            </Link>
          </div>
        )}
        <button className={styles.primary} type="submit" disabled={busy}>
          {busy ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>
      </form>
      {!config?.ssoEnabled && !adminLogin && (
        <>
          <div className={styles.separator}>hoặc</div>
          <GoogleSignInButton onResult={google} onError={setError} />
        </>
      )}
      <div className={styles.footer}>
        <Link
          className={styles.link}
          href={config?.ssoEnabled ? "/login" : "/register"}
        >
          {config?.ssoEnabled ? "Đăng nhập FIT LHU SSO" : "Tạo tài khoản"}
        </Link>
      </div>
    </AuthCard>
  );
}
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthCard title="Đăng nhập">
          <p className={styles.hint}>Đang tải…</p>
        </AuthCard>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
