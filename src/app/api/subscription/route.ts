import { getDb, userIdFrom } from "@/lib/auth";
import { subscription } from "@/db/schema";
import { parseSubscription } from "@/lib/profile";

// Demo: until real payments exist, the client reports plan changes and credit spend and the server
// stores them. Once checkout is real, plan changes must come from the payment webhook, not this route.
export async function PUT(req: Request) {
  const id = await userIdFrom(req);
  if (!id) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const s = parseSubscription(await req.json().catch(() => null));
  if (typeof s === "string") return Response.json({ error: s }, { status: 400 });
  const now = new Date();
  await getDb().insert(subscription).values({ userId: id, updatedAt: now, ...s })
    .onConflictDoUpdate({ target: subscription.userId, set: { ...s, updatedAt: now } });
  return Response.json({ ok: true });
}
