import { eq } from "drizzle-orm";
import { getDb, planOf, userIdFrom } from "@/lib/auth";
import { subscription, timetable } from "@/db/schema";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { cleanTimetable } from "@/lib/timetable";

/** Saves the signed-in user's timetable, replacing any earlier one. Each user only ever reaches their own row. */
export async function PUT(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  const db = getDb();
  const [sub] = await db.select({ plan: subscription.plan }).from(subscription).where(eq(subscription.userId, userId));
  if (planOf(sub) === "None") return Response.json({ error: "Choose a plan to use TimeTable." }, { status: 402 });
  const input = cleanTimetable(await readJson(req));
  if (typeof input === "string") return Response.json({ error: input }, { status: 400 });
  const row = { userId, input: JSON.stringify(input), updatedAt: new Date() };
  await db.insert(timetable).values(row).onConflictDoUpdate({ target: timetable.userId, set: { input: row.input, updatedAt: row.updatedAt } });
  return Response.json({ input });
}

/** Deletes the signed-in user's timetable. */
export async function DELETE(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  await getDb().delete(timetable).where(eq(timetable.userId, userId));
  return Response.json({ ok: true });
}
