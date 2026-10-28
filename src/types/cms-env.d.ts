// Secrets for the Notion sync. They are set with `wrangler secret put` and are not in wrangler.jsonc, so
// `wrangler types` does not know about them.
interface CloudflareEnv {
  NOTION_TOKEN?: string;
  ADMIN_SYNC_TOKEN?: string;
}
