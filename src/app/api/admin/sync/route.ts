import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { syncNotion } from "@/lib/notion/sync";

/**
 * Constant-time compare, so the token cannot be guessed one character at a time. Both sides are hashed first, so
 * the time does not depend on the token's length either.
 */
async function same(a: string, b: string) {
  const digest = async (s: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  const [x, y] = await Promise.all([digest(a), digest(b)]);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
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
  if (!(await same(given, env.ADMIN_SYNC_TOKEN))) return Response.json({ error: "forbidden" }, { status: 403 });
  try {
    const summary = await syncNotion({ token: env.NOTION_TOKEN, rootDatabaseId: env.NOTION_ROOT_DATABASE_ID, db: getDb() });
    return Response.json({ ok: true, ...summary });
  } catch (e) {
    // The detail stays in the Worker log; the caller learns only that it failed.
    console.error("notion sync failed", e);
    return Response.json({ ok: false, error: "sync failed" }, { status: 502 });
  }
}
