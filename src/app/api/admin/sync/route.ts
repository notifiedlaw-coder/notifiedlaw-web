import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { syncNotion } from "@/lib/notion/sync";

/** Constant-time string compare, so the token cannot be guessed one character at a time. */
function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// POST /api/admin/sync with `Authorization: Bearer <ADMIN_SYNC_TOKEN>` copies the Notion CMS into D1.
export async function POST(req: Request) {
  // Before the token check, so the bearer token cannot be brute-forced.
  const rl = await limited(req, "ADMIN");
  if (rl) return rl;
  const { env } = getCloudflareContext();
  if (!env.NOTION_TOKEN || !env.ADMIN_SYNC_TOKEN) return Response.json({ error: "sync is not configured" }, { status: 503 });
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!same(given, env.ADMIN_SYNC_TOKEN)) return Response.json({ error: "forbidden" }, { status: 403 });
  try {
    const summary = await syncNotion({ token: env.NOTION_TOKEN, rootDatabaseId: env.NOTION_ROOT_DATABASE_ID, db: getDb() });
    return Response.json({ ok: true, ...summary });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "sync failed" }, { status: 502 });
  }
}
