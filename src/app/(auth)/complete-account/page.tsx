"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import {
  AuthCard,
  authError,
  safeAuthRedirect,
} from "@/features/auth/AuthFields";
import { fitSsoApi } from "@/services/fit-sso-api";
import {FitSsoSignIn} from '@/features/auth/FitSsoSignIn';
import { selfAuthApi } from "@/services/self-service-auth-api";
import styles from "@/features/auth/auth-pages.module.css";
import { AccountDetailsFields } from "@/features/auth/AccountDetailsFields";

export default function CompleteAccountPage() {
  const {
    user,
    isLoading,
    isAuthenticated,
    clearLocalSession,
    logout,
    acceptSession,
  } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState(""),
    [department, setDepartment] = useState(""),
    [phone, setPhone] = useState("");
  const [password, setPassword] = useState(""),
    [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  const submitting = useRef(false);
  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setDepartment(user.department || "");
      setPhone(user.phone || "");
    }
  }, [user]);
  useEffect(() => {
    if (isLoading || done) return;
    if (!isAuthenticated) router.replace("/login");
    else if (!user?.requiresAccountSetup)
      router.replace(user?.mustChangePassword ? "/change-password" : "/");
  }, [isLoading, isAuthenticated, user, done, router]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    if (user?.usesSso) {
      submitting.current = true;
      setBusy(true);
      try {
        const result = await fitSsoApi.profile({ fullName, department, phone });
        await acceptSession();
        router.replace(safeAuthRedirect(result.redirectTo));
      } catch (e) {
        setError(authError(e));
      } finally {
        submitting.current = false;
        setBusy(false);
      }
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (
      password.length < 12 ||
      new TextEncoder().encode(password).length > 72
    ) {
      setError("Mật khẩu cần ít nhất 12 ký tự và không quá 72 byte UTF-8.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      await selfAuthApi.accountSetup({
        fullName,
        department,
        phone,
        password,
        confirmPassword,
      });
      setDone(true);
      clearLocalSession();
      router.replace("/login?setup=complete");
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  }
  if (isLoading || !user?.requiresAccountSetup || done)
    return <p role="status">Đang tải tài khoản…</p>;
  if(user.ssoLinked&&!user.usesSso)return <AuthCard title="Đăng ký tài khoản"><FitSsoSignIn label="Tiếp tục bằng FIT LHU SSO"/></AuthCard>;
  return (
    <AuthCard title="Đăng ký tài khoản">
      <form className={styles.form} onSubmit={submit}>
        {error && (
          <p
            className={styles.error}
            role="alert"
            tabIndex={-1}
            ref={(node) => node?.focus()}
          >
            {error}
          </p>
        )}
        <AccountDetailsFields
          email={user.email}
          prefix="setup"
          values={{ fullName, department, phone, password, confirmPassword }}
          onChange={(field, value) =>
            ({
              fullName: setFullName,
              department: setDepartment,
              phone: setPhone,
              password: setPassword,
              confirmPassword: setConfirmPassword,
            })[field](value)
          }
          busy={busy}
          includePassword={!user.usesSso}
        />
        <button className={styles.primary} type="submit" disabled={busy}>
          {busy ? "Đang lưu…" : "Hoàn tất tài khoản"}
        </button>
        {!user.usesSso && (
          <p className="text-center text-xs leading-5 text-slate-500">
            Hoàn tất xong, bạn đăng nhập lại để sử dụng hệ thống.
          </p>
        )}
        <button
          className={styles.link}
          type="button"
          disabled={busy}
          onClick={async () => {
            try {
              const redirectTo = await logout();
              if (redirectTo) {
                window.location.assign(redirectTo);
                return;
              }
              router.replace("/login");
            } catch (e) {
              setError(authError(e));
            }
          }}
        >
          Đăng xuất
        </button>
      </form>
    </AuthCard>
  );
}
