import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { areFriends, blockedEitherWay } from "@/lib/friends";
import { membership } from "@/lib/groups";
import { dmChat, groupChat, setTyping } from "@/lib/typing";

/**
 * POST /api/typing { friendId } or { groupId }, { on }: the user is typing there (for the next few seconds), or has
 * stopped. The composer sends this at most every few seconds while keys are pressed.
 */
export async function POST(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "TYPING", userId);
  if (rl) return rl;
  const b = (await readJson(req)) as { friendId?: unknown; groupId?: unknown; on?: unknown } | null;
  const id = (v: unknown) => (typeof v === "string" && v.length <= 64 ? v : null);
  const friendId = id(b?.friendId), groupId = id(b?.groupId);
  let chat: string;
  if (friendId) {
    if (!(await areFriends(userId, friendId)) || (await blockedEitherWay(userId, friendId))) return Response.json({ error: "You can only message friends." }, { status: 403 });
    chat = dmChat(friendId);
  } else if (groupId) {
    if (!(await membership(userId, groupId))) return Response.json({ error: "You are not in this group." }, { status: 403 });
    chat = groupChat(groupId);
  } else return Response.json({ error: "Bad request." }, { status: 400 });
  await setTyping(userId, chat, b?.on !== false);
  return new Response(null, { status: 204 });
}
