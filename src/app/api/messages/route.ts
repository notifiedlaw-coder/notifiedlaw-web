import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { threads } from "@/lib/messages";
import { typingFor } from "@/lib/typing";

/** GET /api/messages: each conversation's newest message and unread count, and who is typing, for the friends list. */
export async function GET(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "READS", userId);
  if (rl) return rl;
  const [t, typing] = await Promise.all([threads(userId), typingFor(userId)]);
  return Response.json({ threads: t, typing });
}
