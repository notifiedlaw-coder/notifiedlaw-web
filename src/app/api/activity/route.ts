import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { myStreak, recordActivity } from "@/lib/activity";
import { incomingCount } from "@/lib/friends";

/** POST /api/activity: the app shell's heartbeat. Marks the user as seen and counts today towards their streak; returns their streak and the friend requests waiting on them. */
export async function POST(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "READS", userId);
  if (rl) return rl;
  const [, incoming] = await Promise.all([recordActivity(userId), incomingCount(userId)]);
  return Response.json({ incoming, ...(await myStreak(userId)) });
}
