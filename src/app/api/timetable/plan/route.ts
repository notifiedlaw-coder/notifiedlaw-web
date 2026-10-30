import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { canPlan, planTimetable, timetableFor } from "@/lib/timetable-db";

/** Fills the signed-in user's free time with sessions up to their exams, around the sessions they placed themselves. */
export async function POST(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = (await limited(req, "TIMETABLE", userId)) ?? (await limited(req, "WRITES", userId));
  if (rl) return rl;
  if (!(await canPlan(userId))) return Response.json({ error: "Choose a plan to use TimeTable." }, { status: 402 });
  const t = await timetableFor(userId);
  if (!t?.input.courses.some((c) => c.examDate)) return Response.json({ error: "Put at least one exam on the calendar first." }, { status: 409 });
  if (!t.input.free.length) return Response.json({ error: "Mark your free time on the calendar first." }, { status: 409 });
  return Response.json(await planTimetable(userId, t));
}
