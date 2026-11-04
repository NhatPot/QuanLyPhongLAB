export function requiresAccountSetup(
  user: {
    passwordHash: string | null;
    ssoLinked?: boolean;
    fullName?: string;
    department?: string;
    phone?: string;
  },
  context?: { usesSso?: boolean; roles?: string[] },
) {
  if (
    !context?.usesSso &&
    context?.roles?.includes("ADMIN") &&
    user.passwordHash
  )
    return false;
  return user.ssoLinked
    ? !user.fullName?.trim() || !user.department?.trim() || !user.phone?.trim()
    : !user.passwordHash;
}
