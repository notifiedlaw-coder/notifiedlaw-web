// Relative imports only: custom-worker.ts imports this file, outside Next's "@/" aliases.

const COOKIE = /(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=([^;]+)/;
const enc = new TextEncoder();
let cached: { secret: string; key: Promise<CryptoKey> } | undefined;

const hmacKey = (secret: string) => {
  if (cached?.secret !== secret) cached = { secret, key: crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]) };
  return cached.key;
};

/**
 * Who a rate limit counts against: the signed-in session when the request carries a genuine Better Auth session
 * cookie, else the client IP. The cookie is `token.signature` (HMAC-SHA256 with BETTER_AUTH_SECRET), checked here
 * with no database read, so a made-up cookie falls back to the IP and cannot dodge the limit. Signed-in students on
 * one campus or mobile network IP each get their own bucket instead of sharing it. The key holds a hash of the
 * token, never the token itself.
 */
export async function clientKey(req: Request, secret: string | undefined) {
  const ip = `ip:${req.headers.get("cf-connecting-ip") ?? "anon"}`;
  const raw = secret && COOKIE.exec(req.headers.get("cookie") ?? "")?.[1];
  if (!raw) return ip;
  try {
    const value = decodeURIComponent(raw);
    const dot = value.lastIndexOf(".");
    if (dot < 1) return ip;
    const token = value.slice(0, dot);
    const sig = Uint8Array.from(atob(value.slice(dot + 1)), (c) => c.charCodeAt(0));
    if (!(await crypto.subtle.verify("HMAC", await hmacKey(secret), sig, enc.encode(token)))) return ip;
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(token)));
    return `s:${[...hash.slice(0, 12)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
  } catch {
    return ip;
  }
}
