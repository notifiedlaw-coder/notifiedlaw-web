import { getDb, userIdFrom } from "@/lib/auth";
import { subscription } from "@/db/schema";
import { DEMO_BILLING } from "@/lib/site";
import { readJson } from "@/lib/http";
import { parseSubscription } from "@/lib/profile";

// Development only: lets the demo checkout and the settings preview write a plan. Production never trusts
// the client for this; plan changes there must come from the payment webhook.
export async function PUT(req: Request) {
  if (!DEMO_BILLING) return Response.json({ error: "forbidden" }, { status: 403 });
  const id = await userIdFrom(req);
  if (!id) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const s = parseSubscription(await readJson(req));
  if (typeof s === "string") return Response.json({ error: s }, { status: 400 });
  const now = new Date();
  await getDb().insert(subscription).values({ userId: id, updatedAt: now, ...s })
    .onConflictDoUpdate({ target: subscription.userId, set: { ...s, updatedAt: now } });
  return Response.json({ ok: true });
}
