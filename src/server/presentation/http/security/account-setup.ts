import { AppError } from "../../../shared/errors/AppError";

// A Google-only session can read its own profile, complete setup or sign out.
// Check current database state on each request, including bearer/API clients.
export function assertAccountSetupAccess(
  user: { requiresAccountSetup?: boolean },
  method: string,
  path: string,
) {
  if (!user.requiresAccountSetup) return;
  const allowed = new Set([
    "GET /api/auth/me",
    "POST /api/auth/account-setup",
    "POST /api/auth/logout-all",
    "POST /api/auth/sso/profile",
    "POST /api/auth/sso/logout",
  ]);
  if (
    !allowed.has(
      `${method.toUpperCase()} ${path.split("?")[0].replace(/\/$/, "")}`,
    )
  ) {
    throw new AppError(
      "Vui lòng hoàn thiện hồ sơ trước khi sử dụng hệ thống.",
      "ACCOUNT_SETUP_REQUIRED",
      403,
    );
  }
}
