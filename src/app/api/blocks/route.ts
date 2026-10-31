import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { block, blockedBy, related, unblock } from "@/lib/moderation";

/** GET /api/blocks: the accounts the signed-in user has blocked. */
export async function GET(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "READS", userId);
  if (rl) return rl;
  return Response.json({ blocked: await blockedBy(userId) });
}

/** POST /api/blocks { userId, on }: blocks someone (ending any friendship and conversation), or unblocks them. */
export async function POST(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  const b = (await readJson(req)) as { userId?: unknown; on?: unknown } | null;
  const other = typeof b?.userId === "string" && b.userId.length <= 64 ? b.userId : "";
  if (!other || other === userId || typeof b?.on !== "boolean") return Response.json({ error: "Choose someone." }, { status: 400 });
  if (b.on) {
    if (!(await related(userId, other))) return Response.json({ error: "Choose someone." }, { status: 400 });
    await block(userId, other);
  }
  else await unblock(userId, other);
  return Response.json({ blocked: await blockedBy(userId) });
}
