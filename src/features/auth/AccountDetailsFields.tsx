import { Building2, Phone, UserRound } from "lucide-react";
import { AuthField, AuthPassword } from "./AuthFields";
import styles from "./auth-pages.module.css";

export interface AccountDetailsValues {
  fullName: string;
  department: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

// Email registration and Google onboarding share one set of required fields.
export function AccountDetailsFields({
  email,
  values,
  onChange,
  busy,
  prefix,
  includePassword = true,
}: {
  email: string;
  values: AccountDetailsValues;
  onChange: (field: keyof AccountDetailsValues, value: string) => void;
  busy: boolean;
  prefix: "registration" | "setup";
  includePassword?: boolean;
}) {
  const setup = prefix === "setup";
  return (
    <>
      <AuthField
        id={`${prefix}-email`}
        label="Email trường / tài khoản đăng nhập"
        showLabel
        type="email"
        value={email}
        readOnly
        autoComplete="username"
      />
      <AuthField
        id={setup ? "setup-full-name" : "full-name"}
        label="Họ và tên"
        showLabel
        icon={<UserRound size={17} />}
        value={values.fullName}
        onChange={(e) => onChange("fullName", e.target.value)}
        autoComplete="name"
        required
        minLength={2}
        maxLength={255}
        disabled={busy}
      />
      <AuthField
        id={`${prefix}-department`}
        label="Ngành / Phòng ban"
        showLabel
        icon={<Building2 size={17} />}
        value={values.department}
        onChange={(e) => onChange("department", e.target.value)}
        autoComplete="organization"
        required
        minLength={2}
        maxLength={255}
        disabled={busy}
      />
      <AuthField
        id={`${prefix}-phone`}
        label="Số điện thoại"
        showLabel
        icon={<Phone size={17} />}
        type="tel"
        value={values.phone}
        onChange={(e) => onChange("phone", e.target.value)}
        autoComplete="tel"
        required
        maxLength={50}
        disabled={busy}
      />
      {includePassword && (
        <>
          <AuthPassword
            id={setup ? "setup-password" : "new-password"}
            label="Mật khẩu"
            showLabel
            value={values.password}
            onChange={(e) => onChange("password", e.target.value)}
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={72}
            disabled={busy}
            aria-describedby={`${prefix}-password-help`}
          />
          <p id={`${prefix}-password-help`} className={styles.hint}>
            Ít nhất 12 ký tự. Bạn chỉ cần đặt mật khẩu một lần.
          </p>
          <AuthPassword
            id={setup ? "setup-confirm" : "confirm-password"}
            label="Xác nhận mật khẩu"
            showLabel
            value={values.confirmPassword}
            onChange={(e) => onChange("confirmPassword", e.target.value)}
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={72}
            disabled={busy}
          />
        </>
      )}
    </>
  );
}
