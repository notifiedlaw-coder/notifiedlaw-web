// The Worker entry: OpenNext's generated handler, plus the Durable Object classes wrangler.jsonc binds.
import { Container } from "@cloudflare/containers";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- `.open-next/worker.js` exists only after `opennextjs-cloudflare build`
import { default as handler } from "./.open-next/worker.js";

export default { fetch: handler.fetch } satisfies ExportedHandler<CloudflareEnv>;

/**
 * ClamAV (scanner/Dockerfile). One named instance serves every upload (src/lib/scan.ts); it sleeps after 30 idle
 * minutes, and the first scan after that waits for clamd to load its signatures (well under a minute).
 */
export class Scanner extends Container {
  defaultPort = 8080;
  sleepAfter = "30m";
}
