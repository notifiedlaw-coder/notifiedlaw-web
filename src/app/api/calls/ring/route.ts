import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { ringing } from "@/lib/calls";

/** GET /api/calls/ring: calls ringing for the signed-in user (direct calls to them, group calls just started). */
export async function GET(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "CALLS", userId);
  if (rl) return rl;
  return Response.json({ calls: await ringing(userId) });
}
