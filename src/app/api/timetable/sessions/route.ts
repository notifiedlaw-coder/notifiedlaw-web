import { userIdFrom, getDb } from "@/lib/auth";
import { timetableSession } from "@/db/schema";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { MAX_SESSIONS, clash, cleanSession } from "@/lib/timetable";
import { canPlan, timetableFor } from "@/lib/timetable-db";

/** Adds a study session to the signed-in user's timetable, for one of its courses, where it overlaps no other. */
export async function POST(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  if (!(await canPlan(userId))) return Response.json({ error: "Choose a plan to use TimeTable." }, { status: 402 });
  const t = await timetableFor(userId);
  if (!t) return Response.json({ error: "Set up your timetable first." }, { status: 404 });
  if (t.sessions.length >= MAX_SESSIONS) return Response.json({ error: `You can have up to ${MAX_SESSIONS} sessions.` }, { status: 409 });
  const s = cleanSession(await readJson(req), t.input.courses);
  if (typeof s === "string") return Response.json({ error: s }, { status: 400 });
  if (clash(s, t.sessions)) return Response.json({ error: "That overlaps another session." }, { status: 409 });
  const session = { ...s, id: crypto.randomUUID(), review: false, auto: false };
  await getDb().insert(timetableSession).values({ id: session.id, userId, courseId: s.courseId, date: s.date, startTime: s.start, endTime: s.end });
  return Response.json({ session }, { status: 201 });
}
