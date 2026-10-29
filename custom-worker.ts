// The Worker entry: OpenNext's generated handler, plus the Durable Object classes wrangler.jsonc binds.
import { Container } from "@cloudflare/containers";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- `.open-next/worker.js` exists only after `opennextjs-cloudflare build`
import { default as handler } from "./.open-next/worker.js";
import { clientKey } from "./src/lib/client-key";

/**
 * Every request that reaches the Worker (pages, RSC fetches, API, media) counts against RL_PAGES, per signed-in
 * session or else per IP (src/lib/client-key.ts). Static assets are served before the Worker runs and are free,
 * so they never count. The per-route limits in src/lib/rate-limit.ts still apply on top.
 */
export default {
  async fetch(req, env, ctx) {
    const { success } = await env.RL_PAGES.limit({ key: await clientKey(req, env.BETTER_AUTH_SECRET) });
    if (!success) return new Response("Too many requests. Slow down and try again shortly.", { status: 429, headers: { "retry-after": "60", "content-type": "text/plain; charset=utf-8" } });
    return handler.fetch(req, env, ctx);
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
