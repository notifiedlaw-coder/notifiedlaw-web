import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { apiError } from "@/lib/error-codes";
import { chatsOf, creditsLeft } from "@/lib/ai/chats";

/** GET /api/ai/chats: the signed-in user's conversations, newest first, and their Notify Credits. */
export async function GET(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return apiError("A001", 401);
  const rl = await limited(req, "READS", userId);
  if (rl) return rl;
  const [chats, credits] = await Promise.all([chatsOf(userId), creditsLeft(userId)]);
  return Response.json({ chats, credits }, { headers: { "cache-control": "private, no-store" } });
}
