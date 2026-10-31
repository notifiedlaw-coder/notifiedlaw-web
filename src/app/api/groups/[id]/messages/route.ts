import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { groupMessages, membership, postGroupMessage } from "@/lib/groups";
import { people } from "@/lib/friends";
import { MAX_MESSAGE } from "@/lib/friend-view";
import { PROFANITY_ERROR, hasProfanity } from "@/lib/profanity";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/groups/<id>/messages?after=<ms>: the group's messages (or those from `after` on); marks the group read. */
export async function GET(req: Request, { params }: Ctx) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "READS", userId);
  if (rl) return rl;
  const id = (await params).id;
  if (!(await membership(userId, id))) return Response.json({ error: "You are not in this group." }, { status: 403 });
  const after = Number(new URL(req.url).searchParams.get("after"));
  return Response.json({ messages: await groupMessages(userId, id, Number.isFinite(after) && after > 0 ? after : undefined) });
}

/** POST /api/groups/<id>/messages { body }: posts to the group. */
export async function POST(req: Request, { params }: Ctx) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "MESSAGES", userId);
  if (rl) return rl;
  const b = (await readJson(req)) as { body?: unknown } | null;
  const body = typeof b?.body === "string" ? b.body.trim() : "";
  if (!body) return Response.json({ error: "Write a message first." }, { status: 400 });
  if (body.length > MAX_MESSAGE) return Response.json({ error: `Messages can be up to ${MAX_MESSAGE} characters.` }, { status: 400 });
  if (hasProfanity(body)) return Response.json({ error: PROFANITY_ERROR }, { status: 400 });
  const id = (await params).id;
  if (!(await membership(userId, id))) return Response.json({ error: "You are not in this group." }, { status: 403 });
  const row = await postGroupMessage(userId, id, body);
  const me = (await people([userId])).get(userId);
  return Response.json({ message: { id: row.id, fromId: userId, fromMe: true, name: me?.name ?? "You", avatar: me?.avatar ?? null, body, at: row.createdAt.getTime() } });
}
