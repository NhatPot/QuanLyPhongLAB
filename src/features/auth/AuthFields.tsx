"use client";
import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import styles from "./auth-pages.module.css";

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.card} aria-label={title}>
      <h1 className={styles.title} tabIndex={-1} data-auth-title>
        {title}
      </h1>
      {description && <div className={styles.description}>{description}</div>}
      {children}
    </section>
  );
}
export function AuthField({
  label,
  icon,
  id,
  showLabel = false,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: ReactNode;
  id: string;
  showLabel?: boolean;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={showLabel ? styles.label : styles.srOnly}>
        {label}
      </label>
      <div className={styles.control}>
        <span className={styles.icon}>{icon || <Mail size={17} />}</span>
        <input id={id} {...props} />
      </div>
    </div>
  );
}
export function AuthPassword({
  label = "Mật khẩu",
  id,
  showLabel = false,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  id: string;
  showLabel?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={showLabel ? styles.label : styles.srOnly}>
        {label}
      </label>
      <div className={styles.control}>
        <LockKeyhole className={styles.icon} />
        <input id={id} {...props} type={visible ? "text" : "password"} />
        <button
          className={styles.eye}
          type="button"
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}
export function authError(error: unknown) {
  const e = error as {
    response?: { data?: { error?: { message?: string }; message?: string } };
    message?: string;
  };
  return (
    e.response?.data?.error?.message ||
    e.response?.data?.message ||
    "Không thể xử lý yêu cầu lúc này. Vui lòng thử lại."
  );
}
export function safeAuthRedirect(value: string | null | undefined) {
  return value &&
    /^\/(?!\/)/.test(value) &&
    !/[\\\u0000-\u0020]/.test(value) &&
    !value.startsWith("/api/") &&
    !/^\/(login|register|forgot-password)/.test(value)
    ? value
    : "/";
}
