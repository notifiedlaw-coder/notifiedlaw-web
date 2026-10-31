import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { fromApp, readJson } from "@/lib/http";
import { areFriends } from "@/lib/friends";
import { conversation, hasHistory, sendMessage } from "@/lib/messages";
import { friendTyping } from "@/lib/typing";
import { MAX_MESSAGE } from "@/lib/friend-view";
import { PROFANITY_ERROR, hasProfanity } from "@/lib/profanity";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/messages/<friend id>?after=<ms>: the conversation, or only what came from `after` on. Opening it marks the
 * friend's messages read, which moves their delete date to 30 days from now. `typing` is whether the friend is typing.
 * After the friendship ends (unfriended or blocked) the conversation can still be read and reported until it
 * expires, as on Messenger, but shows no typing or read receipts and takes no replies (`canReply` false).
 */
export async function GET(req: Request, { params }: Ctx) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "READS", userId);
  if (rl) return rl;
  const friendId = (await params).id;
  const friends = await areFriends(userId, friendId);
  if (!friends && !(await hasHistory(userId, friendId))) return Response.json({ error: "You can only message friends." }, { status: 403 });
  const after = Number(new URL(req.url).searchParams.get("after"));
  const c = await conversation(userId, friendId, Number.isFinite(after) && after > 0 ? after : undefined, fromApp(req));
  if (!friends) return Response.json({ messages: c.messages, seen: null, typing: false, canReply: false });
  return Response.json({ ...c, typing: await friendTyping(userId, friendId), canReply: true });
}

/** POST /api/messages/<friend id> { body }: sends a message to a friend. */
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
  const friendId = (await params).id;
  if (!(await areFriends(userId, friendId))) return Response.json({ error: "You can only message friends." }, { status: 403 });
  return Response.json({ message: await sendMessage(userId, friendId, body) });
}
