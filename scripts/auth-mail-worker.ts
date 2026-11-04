import "../src/server/config/load-environment";
import { selfServiceAuth } from "../src/server/container/self-service-container";
import { SqlConnectionFactory } from "../src/server/infrastructure/database/sqlserver/connection";

async function run() {
  const auth = selfServiceAuth();
  if (!auth.config.mailReady)
    throw new Error(
      "Cần bật AUTH_EMAIL_ENABLED và cấu hình SMTP, AUTH_OTP_SECRET, AUTH_EMAIL_ENCRYPTION_KEY trước khi chạy worker.",
    );
  if (process.argv.includes("--verify")) {
    try {
      await auth.verifyDelivery();
      console.log(
        "[auth-mail-worker] Kết nối và xác thực SMTP hợp lệ. Chưa gửi thư.",
      );
    } catch {
      throw new Error(
        "Không xác minh được SMTP. Kiểm tra cấu hình tài khoản gửi.",
      );
    }
    return;
  }
  if (process.argv.includes("--resume")) {
    try {
      await auth.resumeDelivery();
    } catch {
      throw new Error(
        "Chưa khôi phục gửi mail: cần xác minh SMTP hợp lệ trước.",
      );
    }
  }
  let stopped = false,
    iterations = 0;
  process.on("SIGINT", () => {
    stopped = true;
  });
  process.on("SIGTERM", () => {
    stopped = true;
  });
  do {
    try {
      const processed = await auth.deliverNext();
      if (++iterations % 100 === 0) await auth.cleanup();
      if (!processed && !process.argv.includes("--once"))
        await new Promise((resolve) => setTimeout(resolve, 2500));
    } catch {
      // Never dump SMTP error objects: they can contain recipient or message data.
      console.error(
        "[auth-mail-worker] Không xử lý được hàng đợi; sẽ thử lại.",
      );
      if (!process.argv.includes("--once"))
        await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  } while (!stopped && !process.argv.includes("--once"));
}
run()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Không khởi động được worker.",
    );
    process.exitCode = 1;
  })
  .finally(() => SqlConnectionFactory.close());
