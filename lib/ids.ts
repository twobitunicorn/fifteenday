import { randomBytes } from "node:crypto";

const ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

/**
 * Short, URL-safe, ambiguity-free identifier used in reply-to aliases like
 * `req-<id>@inbound.fifteenday.org`. 10 chars of 33-char alphabet ≈ 50 bits.
 * Plenty for a few thousand requests and short enough to read aloud.
 */
export function shortId(length = 10): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

export function replyAliasFor(id: string): string {
  const domain = process.env.INBOUND_DOMAIN;
  if (!domain) {
    throw new Error("INBOUND_DOMAIN is not set");
  }
  return `req-${id}@${domain}`;
}
