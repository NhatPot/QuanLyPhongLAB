import { Brand } from "@/components/layout/brand";
import styles from "@/features/auth/auth-pages.module.css";

/* Direction contract (user-pinned reference; FORM seed N/A):
 * THESIS: Preserve the original split page; refine only the account form.
 * OWN-WORLD: Original navy introduction, light right surface, white compact form.
 * STORY: Sign in/register/recover; verify OTP; teachers await approval.
 * FIRST VIEWPORT: Original brand/intro left; max-410px form right.
 * FORM: User correction 04/11/2026 pins the existing page and compact form only.
 * Review/evidence: designs/auth-pages/README.md and docs/plans/google-email-registration.md.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className={styles.page}>
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#06294c] via-[#073761] to-[#0a4a7d] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_25%_25%,#60a5fa_0,transparent_35%),radial-gradient(circle_at_75%_80%,#38bdf8_0,transparent_28%)]" />
        <div className="absolute inset-0 opacity-10 [background-image:linear-gradient(rgba(255,255,255,.25)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.25)_1px,transparent_1px)] [background-size:34px_34px]" />
        <Brand className="relative z-10" />
        <div className="relative z-10 my-auto max-w-xl py-6">
          <h2 className="text-5xl font-extrabold leading-[1.1] tracking-tight">
            Vận hành phòng Lab<br />
            <span className="bg-gradient-to-r from-blue-300 to-cyan-200 bg-clip-text text-transparent">thông minh hơn.</span>
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-blue-100/80">
            Theo dõi máy tính, thiết bị, lịch sử dụng và sự cố trên một giao diện trực quan, thống nhất.
          </p>
        </div>
        <div className="relative z-10 text-xs font-medium text-blue-200/60">Phát triển bởi Đại học Lạc Hồng</div>
      </section>
      <section className={styles.content} aria-label="Tài khoản">
        <div className={styles.mobileBrand}>
          <Brand className="[&_p]:text-slate-900 [&_p+p]:text-slate-500" />
        </div>
        {children}
      </section>
    </main>
  );
}
