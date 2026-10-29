import { eq } from "drizzle-orm";
import { getDb, userIdFrom } from "@/lib/auth";
import { timetable, timetableSession } from "@/db/schema";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { cleanTimetable } from "@/lib/timetable";
import { canPlan, saveTimetable } from "@/lib/timetable-db";

/**
 * Saves the signed-in user's timetable, replacing any earlier one, and rebuilds its sessions from today on.
 * Each user only ever reaches their own rows.
 */
export async function PUT(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  if (!(await canPlan(userId))) return Response.json({ error: "Choose a plan to use TimeTable." }, { status: 402 });
  const input = cleanTimetable(await readJson(req));
  if (typeof input === "string") return Response.json({ error: input }, { status: 400 });
  return Response.json(await saveTimetable(userId, input));
}

/** Deletes the signed-in user's timetable and all its sessions. */
export async function DELETE(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  const db = getDb();
  await db.batch([db.delete(timetableSession).where(eq(timetableSession.userId, userId)), db.delete(timetable).where(eq(timetable.userId, userId))]);
  return Response.json({ ok: true });
}
