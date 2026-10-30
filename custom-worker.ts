// The Worker entry: OpenNext's generated handler, plus the Durable Object classes wrangler.jsonc binds.
import { Container } from "@cloudflare/containers";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- `.open-next/worker.js` exists only after `opennextjs-cloudflare build`
import { default as handler } from "./.open-next/worker.js";
import { clientKey } from "./src/lib/client-key";

const BLOCK_MS = 10 * 60_000;
const MAX_BLOCKED = 10_000;
/** Keys over RL_PAGES, until when (epoch ms). Per isolate, so it is best effort; RL_PAGES still holds without it. */
const blocked = new Map<string, number>();

const tooMany = (seconds: number) =>
  new Response("Too many requests. Slow down and try again shortly.", { status: 429, headers: { "retry-after": String(seconds), "content-type": "text/plain; charset=utf-8" } });

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
    try {
      return await handler.fetch(req, env, ctx);
    } catch (e) {
      // Never show a raw platform error. API callers get a code-only body; pages get a plain apology.
      console.error("unhandled", e);
      const api = new URL(req.url).pathname.startsWith("/api/");
      return api
        ? Response.json({ code: "S500" }, { status: 500, headers: { "cache-control": "private, no-store" } })
        : new Response("Something went wrong. Please try again. If it keeps happening, email notifiedlaw@gmail.com.", { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } });
    }
  },
} satisfies ExportedHandler<CloudflareEnv>;

/**
 * ClamAV (scanner/Dockerfile). One named instance serves every upload (src/lib/scan.ts); it sleeps after 30 idle
 * minutes, and the first scan after that waits for clamd to load its signatures (well under a minute).
 */
export class Scanner extends Container {
  defaultPort = 8080;
  sleepAfter = "30m";
}
