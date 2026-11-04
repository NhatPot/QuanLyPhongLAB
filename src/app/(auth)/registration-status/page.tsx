import Link from "next/link";
import { Clock3, ArrowLeft } from "lucide-react";
import { AuthCard } from "@/features/auth/AuthFields";
import styles from "@/features/auth/auth-pages.module.css";
export default function RegistrationStatusPage() {
  return (
    <AuthCard
      title="Đang chờ phê duyệt"
      description="Email đã được xác minh. Đăng ký giảng viên của bạn đang chờ quản trị viên phê duyệt."
    >
      <div className={styles.statusIcon}>
        <Clock3 size={28} />
      </div>
      <p className={styles.notice}>
        Sau khi được quản trị viên duyệt, hãy quay lại đăng nhập. Nếu tài khoản
        Google chưa có mật khẩu, hệ thống sẽ yêu cầu bạn đặt mật khẩu và cập nhật
        hồ sơ trước khi sử dụng.
      </p>
      <div className={styles.footer}>
        <Link href="/login" className={`${styles.link} ${styles.back}`}>
          <ArrowLeft size={14} />
          Quay lại đăng nhập
        </Link>
      </div>
    </AuthCard>
  );
}
