import { and, eq } from "drizzle-orm";
import { getDb, userIdFrom } from "@/lib/auth";
import { timetableSession } from "@/db/schema";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { clash, cleanSession } from "@/lib/timetable";
import { canPlan, timetableFor } from "@/lib/timetable-db";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Moves or changes one of the signed-in user's sessions: its course, date, start or end. Unsent fields stay.
 * A changed session is the student's own from then on, so the planner keeps it.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  if (!(await canPlan(userId))) return Response.json({ error: "Choose a plan to use TimeTable." }, { status: 402 });
  const id = (await params).id;
  const t = await timetableFor(userId);
  const old = t?.sessions.find((s) => s.id === id);
  if (!t || !old) return Response.json({ error: "Not found" }, { status: 404 });
  const body = (await readJson(req)) as Record<string, unknown> | null;
  const s = cleanSession({ ...old, ...body }, t.input.courses);
  if (typeof s === "string") return Response.json({ error: s }, { status: 400 });
  if (clash({ ...s, id }, t.sessions)) return Response.json({ error: "That overlaps another session." }, { status: 409 });
  await getDb().update(timetableSession).set({ courseId: s.courseId, date: s.date, startTime: s.start, endTime: s.end, auto: false })
    .where(and(eq(timetableSession.id, id), eq(timetableSession.userId, userId)));
  return Response.json({ session: { ...old, ...s, auto: false } });
}

/** Deletes one of the signed-in user's sessions. */
export async function DELETE(req: Request, { params }: Ctx) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  const id = (await params).id;
  const res = await getDb().delete(timetableSession).where(and(eq(timetableSession.id, id), eq(timetableSession.userId, userId)));
  if (!res.meta.changes) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
