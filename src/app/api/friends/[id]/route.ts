import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { friendLists, respond, unfriend } from "@/lib/friends";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/friends/<user id>: accepts the friend request that user sent, then returns the lists. */
export async function POST(req: Request, { params }: Ctx) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  if (!(await respond(userId, (await params).id))) return Response.json({ error: "That request is no longer open." }, { status: 404 });
  return Response.json(await friendLists(userId));
}

/** DELETE /api/friends/<user id>: declines their request, cancels yours, or removes the friend. Returns the lists. */
export async function DELETE(req: Request, { params }: Ctx) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  await unfriend(userId, (await params).id);
  return Response.json(await friendLists(userId));
}
