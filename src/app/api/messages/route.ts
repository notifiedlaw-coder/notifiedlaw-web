import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { threads } from "@/lib/messages";

/** GET /api/messages: each conversation's newest message and unread count, for the friends list. */
export async function GET(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "READS", userId);
  if (rl) return rl;
  return Response.json({ threads: await threads(userId) });
}
