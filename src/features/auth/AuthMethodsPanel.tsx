"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import { AuthPassword } from "./AuthFields";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { FitSsoSignIn } from "./FitSsoSignIn";
export function AuthMethodsPanel() {
  const [linking, setLinking] = useState(false),
    [password, setPassword] = useState(""),
    [error, setError] = useState("");
  const query = useQuery<{
    hasPassword: boolean;
    googleLinked: boolean;
    emailVerified: boolean;
    googleEnabled: boolean;
    ssoEnabled?: boolean;
    ssoLinked?: boolean;
    ssoAccountUrl?: string;
  }>({
    queryKey: ["auth-security"],
    queryFn: async () => (await apiClient.get("/auth/me/security")).data.data,
    retry: false,
  });
  if (query.data?.ssoEnabled)
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-bold text-slate-900">
          Phương thức đăng nhập
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          {query.data.ssoLinked
            ? "Tài khoản đã liên kết FIT LHU SSO."
            : "Đăng nhập FIT LHU SSO để liên kết tài khoản Lab hiện có."}{" "}
          Mật khẩu, Google, passkey và xác minh email được quản lý tại SSO.
        </p>
        {!query.data.ssoLinked && (
          <div className="mt-4 max-w-sm">
            <FitSsoSignIn returnTo="/profile" label="Liên kết FIT LHU SSO" />
          </div>
        )}
        <a
          className="mt-4 inline-block text-sm font-semibold text-blue-600"
          href={query.data.ssoAccountUrl || "https://auth.fitlhu.com/account"}
          target="_blank"
          rel="noopener noreferrer"
        >
          Quản lý tài khoản FIT LHU SSO
        </a>
      </section>
    );
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-bold text-slate-900">
        Phương thức đăng nhập
      </h2>
      {query.isLoading ? (
        <p className="mt-3 text-sm text-slate-500">Đang tải…</p>
      ) : query.isError ? (
        <p className="mt-3 text-sm text-slate-500">
          Chưa tải được phương thức đăng nhập.{" "}
          <button
            className="text-blue-600 underline"
            type="button"
            onClick={() => query.refetch()}
          >
            Thử lại
          </button>
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
            <span>
              Mật khẩu:{" "}
              {query.data?.hasPassword ? "Đã thiết lập" : "Chưa thiết lập"}
            </span>
            <span>
              Google:{" "}
              {query.data?.googleLinked ? "Đã liên kết" : "Chưa liên kết"}
            </span>
            <span>
              Email:{" "}
              {query.data?.emailVerified ? "Đã xác minh" : "Chưa xác minh"}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-blue-600">
            <Link href="/change-email">Đổi email có xác minh</Link>
            {!query.data?.hasPassword && (
              <Link href="/set-password">Thiết lập mật khẩu qua OTP</Link>
            )}
            {!query.data?.googleLinked && query.data?.googleEnabled && (
              <button
                type="button"
                onClick={() => {
                  setLinking(!linking);
                  setError("");
                  setPassword("");
                }}
              >
                {linking ? "Đóng liên kết Google" : "Liên kết Google"}
              </button>
            )}
          </div>
          {linking && (
            <div className="mt-4 max-w-sm space-y-4 rounded-xl bg-slate-50 p-5 text-slate-900">
              <p className="text-sm text-slate-600">
                Xác nhận mật khẩu hiện tại, sau đó chọn Google có cùng email tài
                khoản.
              </p>
              <AuthPassword
                id="link-google-password"
                label="Mật khẩu hiện tại"
                placeholder="Mật khẩu hiện tại"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && (
                <p className="text-sm text-red-700" role="alert">
                  {error}
                </p>
              )}
              <GoogleSignInButton
                linking
                password={password}
                onError={setError}
                onLinked={async () => {
                  setLinking(false);
                  setPassword("");
                  await query.refetch();
                }}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}
