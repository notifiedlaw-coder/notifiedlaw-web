// The Worker entry: OpenNext's generated handler, plus the Durable Object classes wrangler.jsonc binds.
import { Container } from "@cloudflare/containers";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- `.open-next/worker.js` exists only after `opennextjs-cloudflare build`
import { default as handler } from "./.open-next/worker.js";
import { clientKey } from "./src/lib/client-key";
import { purgeExpired, sweepCalls } from "./src/lib/call-sweep";

const BLOCK_MS = 10 * 60_000;
const MAX_BLOCKED = 10_000;
/** Keys over RL_PAGES, until when (epoch ms). Per isolate, so it is best effort; RL_PAGES still holds without it. */
const blocked = new Map<string, number>();

/** The next.config.ts security headers, for the replies made here before Next.js runs. */
const SECURITY = {
  "content-security-policy": "frame-ancestors 'none'",
  "x-frame-options": "DENY",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
};
const TEXT = { ...SECURITY, "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" };

const tooMany = (seconds: number) =>
  new Response("Too many requests. Slow down and try again shortly.", { status: 429, headers: { ...TEXT, "retry-after": String(seconds) } });

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);
/**
 * A change to /api/ from another site. Cookies are SameSite=Lax, which already keeps them off these requests; this
 * holds even if that ever changes. Callers without browser headers (the admin sync script) are not affected.
 */
function crossSiteWrite(req: Request, url: URL) {
  if (SAFE.has(req.method) || !url.pathname.startsWith("/api/")) return false;
  const site = req.headers.get("sec-fetch-site");
  if (site) return site !== "same-origin" && site !== "none";
  const origin = req.headers.get("origin");
  return !!origin && origin !== url.origin;
}

/**
 * Every request that reaches the Worker (pages, RSC fetches, API, media) counts against RL_PAGES, per signed-in
 * user or else per IP (src/lib/client-key.ts). Static assets are served before the Worker runs and are free,
 * so they never count. Going over blocks the key for BLOCK_MS, answered here before Next.js runs, so a flood costs
 * only the request itself. The per-route limits in src/lib/rate-limit.ts still apply on top.
 */
export default {
  async fetch(req, env, ctx) {
    const key = await clientKey(req, env);
    const now = Date.now();
    const until = blocked.get(key);
    if (until && until > now) return tooMany(Math.ceil((until - now) / 1000));
    if (until) blocked.delete(key);
    if (!(await env.RL_PAGES.limit({ key })).success) {
      if (blocked.size >= MAX_BLOCKED) blocked.delete(blocked.keys().next().value!);
      blocked.set(key, now + BLOCK_MS);
      return tooMany(BLOCK_MS / 1000);
    }
    const url = new URL(req.url);
    if (crossSiteWrite(req, url)) return Response.json({ code: "S403" }, { status: 403, headers: { ...SECURITY, "cache-control": "no-store" } });
    try {
      const res: Response = await handler.fetch(req, env, ctx);
      // Private API replies must never sit in an edge or browser cache; routes that chose a policy keep it.
      if (!url.pathname.startsWith("/api/") || res.headers.has("cache-control")) return res;
      const out = new Response(res.body, res);
      out.headers.set("cache-control", "private, no-store");
      return out;
    } catch (e) {
      // Never show a raw platform error. API callers get a code-only body; pages get a plain apology.
      console.error("unhandled", e);
      return url.pathname.startsWith("/api/")
        ? Response.json({ code: "S500" }, { status: 500, headers: { ...SECURITY, "cache-control": "private, no-store" } })
        : new Response("Something went wrong. Please try again. If it keeps happening, email notifiedlaw@gmail.com.", { status: 500, headers: TEXT });
    }
  },

  /**
   * The crons in wrangler.jsonc. Every five minutes: end calls past 3 hours or abandoned. Daily: delete expired direct
   * and group messages, and call records older than 30 days.
   */
  async scheduled(event, env, ctx) {
    if (event.cron === "*/5 * * * *") ctx.waitUntil(sweepCalls(env.DB, env).then((n) => n && console.log("ended calls", n)));
    else ctx.waitUntil(purgeExpired(env.DB).then((n) => console.log("purged", n)));
  },
} satisfies ExportedHandler<CloudflareEnv>;

/**
 * ClamAV (scanner/Dockerfile). One named instance serves every upload (src/lib/scan.ts); it sleeps after 30 idle
 * minutes, and the first scan after that waits for clamd to load its signatures (well under a minute).
 */
export class Scanner extends Container {
  defaultPort = 8080;
  sleepAfter = "30m";
  /** Shared with the container as SCAN_TOKEN and sent on every scan, so only this object can use the scanner. */
  private token = "";

  override async fetch(req: Request) {
    // Read (or made) before super.fetch starts the container, so the container always starts with it.
    if (!this.token) {
      let token = await this.ctx.storage.get<string>("token");
      if (!token) await this.ctx.storage.put("token", (token = crypto.randomUUID() + crypto.randomUUID()));
      this.token = token;
      this.envVars = { SCAN_TOKEN: token };
    }
    const signed = new Request(req);
    signed.headers.set("x-scan-token", this.token);
    return super.fetch(signed);
  }
}
