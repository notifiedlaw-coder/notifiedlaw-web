import { eq } from "drizzle-orm";
import { getDb, userIdFrom } from "@/lib/auth";
import { profile, subscription } from "@/db/schema";
import { isPlan } from "@/lib/data";

/** Everything the client shell needs about the signed-in user besides their name. */
export async function GET(req: Request) {
  const id = await userIdFrom(req);
  if (!id) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const db = getDb();
  const [p] = await db.select().from(profile).where(eq(profile.userId, id));
  const [s] = await db.select().from(subscription).where(eq(subscription.userId, id));
  return Response.json({
    profile: p ? { ...p, goals: JSON.parse(p.goals) as string[], middleName: p.middleName ?? "", phone: p.phone ?? "" } : null,
    subscription: { plan: s && isPlan(s.plan) ? s.plan : "Free", creditsUsed: s?.creditsUsed ?? 0, creditsExtra: s?.creditsExtra ?? 0 },
  }, { headers: { "cache-control": "private, no-store" } });
}
