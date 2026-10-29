// Relative imports only: custom-worker.ts imports this file, outside Next's "@/" aliases.

const COOKIE = /(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=([^;]+)/;
const enc = new TextEncoder();
let cached: { secret: string; key: Promise<CryptoKey> } | undefined;

const hmacKey = (secret: string) => {
  if (cached?.secret !== secret) cached = { secret, key: crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]) };
  return cached.key;
};

/** Session token to its user id (null: no live session), and until when that answer holds. Per isolate. */
const owners = new Map<string, { userId: string | null; until: number }>();
const OWNER_MS = 5 * 60_000;
const DEAD_MS = 60_000;
const MAX_OWNERS = 20_000;

/** The token from a genuine Better Auth session cookie (`token.signature`, HMAC-SHA256 with the secret), or null. */
async function sessionToken(req: Request, secret: string | undefined) {
  const raw = secret && COOKIE.exec(req.headers.get("cookie") ?? "")?.[1];
  if (!raw) return null;
  try {
    const value = decodeURIComponent(raw);
    const dot = value.lastIndexOf(".");
    if (dot < 1) return null;
    const token = value.slice(0, dot);
    const sig = Uint8Array.from(atob(value.slice(dot + 1)), (c) => c.charCodeAt(0));
    return (await crypto.subtle.verify("HMAC", await hmacKey(secret), sig, enc.encode(token))) ? token : null;
  } catch {
    return null;
  }
}

/** The user a live session belongs to. Looked up in D1 at most every few minutes per token per isolate. */
async function ownerOf(db: D1Database, token: string) {
  const now = Date.now();
  const hit = owners.get(token);
  if (hit && hit.until > now) return hit.userId;
  let userId: string | null = null;
  let until = now + DEAD_MS;
  try {
    const row = await db.prepare("SELECT user_id, expires_at FROM session WHERE token = ?").bind(token).first<{ user_id: string; expires_at: number }>();
    if (row && row.expires_at > now) ({ userId, until } = { userId: row.user_id, until: Math.min(row.expires_at, now + OWNER_MS) });
  } catch {
    return null; // D1 unreachable: count by IP, and ask again next time
  }
  if (owners.size >= MAX_OWNERS) owners.delete(owners.keys().next().value!);
  owners.set(token, { userId, until });
  return userId;
}

/**
 * Who a rate limit counts against: the signed-in user when the request carries a live session, else the client IP.
 * Counting by user, not session, means signing in again does not buy a fresh allowance, and signed-in students on
 * one campus or mobile network IP each get their own. A made-up cookie fails the signature check without touching
 * D1; a signed-out or expired one finds no session. Both count by IP.
 */
export async function clientKey(req: Request, env: { DB: D1Database; BETTER_AUTH_SECRET?: string }) {
  const token = await sessionToken(req, env.BETTER_AUTH_SECRET);
  const userId = token && (await ownerOf(env.DB, token));
  return userId ? `u:${userId}` : `ip:${req.headers.get("cf-connecting-ip") ?? "anon"}`;
}
