export function isSchoolEmail(value: string): boolean {
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@(lachong\.edu\.vn|lhu\.edu\.vn)$/.test(email);
}
