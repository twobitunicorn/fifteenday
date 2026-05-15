import { timingSafeEqual } from "node:crypto";

/**
 * Single-user admin gate for v1. Replace with magic-link auth in Phase D.
 * Reads ADMIN_PASSWORD from env. Compare in constant time to avoid timing
 * leaks, even though the surface area is small.
 */
export function isAdminPassword(supplied: string | undefined | null): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  if (!supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
