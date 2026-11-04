import crypto from "crypto";
import { AppError } from "../../../shared/errors/AppError";

/** Bounded process-local limiter. A shared limiter is required for multiple workers. */
export class LoginRateLimiter {
  private readonly buckets = new Map<
    string,
    { count: number; expires: number }
  >();
  constructor(private readonly now = () => Date.now()) {}

  consume(identifier: string, ip: string) {
    const now = this.now();
    for (const [key, bucket] of this.buckets)
      if (bucket.expires <= now) this.buckets.delete(key);
    const hash = (value: string) =>
      crypto.createHash("sha256").update(value).digest("hex");
    const identity = identifier.trim().toLowerCase();
    const limits = [
      { key: `ip:${hash(ip)}`, max: 50 },
      { key: `account:${hash(identity)}`, max: 20 },
      { key: `pair:${hash(`${ip}:${identity}`)}`, max: 10 },
    ];
    if (
      limits.some(
        ({ key, max }) => (this.buckets.get(key)?.count || 0) >= max,
      ) ||
      this.buckets.size >= 10_000
    ) {
      throw new AppError(
        "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.",
        "LOGIN_RATE_LIMITED",
        429,
      );
    }
    for (const { key } of limits) {
      const bucket = this.buckets.get(key) || {
        count: 0,
        expires: now + 15 * 60_000,
      };
      bucket.count += 1;
      this.buckets.set(key, bucket);
    }
  }
}

export const loginRateLimiter = new LoginRateLimiter();
