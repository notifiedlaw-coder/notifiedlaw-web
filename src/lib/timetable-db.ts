import { getCloudflareContext } from "@opennextjs/cloudflare";
import { asc, eq } from "drizzle-orm";
import { getDb, planOf } from "@/lib/auth";
import { subscription, timetable, timetableSession } from "@/db/schema";
import { DEFAULT_INPUT, buildPlan, planSessions, todayIso, type StoredSession, type TimetableInput } from "@/lib/timetable";

export type TimetableState = { input: TimetableInput; sessions: StoredSession[] };

/** True when the user has a plan that includes TimeTable (any paid plan). */
export async function canPlan(userId: string) {
  const [row] = await getDb().select({ plan: subscription.plan }).from(subscription).where(eq(subscription.userId, userId));
  return planOf(row) !== "None";
}

/** The user's own timetable and sessions, or null if they have not made one. Nobody else's row is ever read. */
export async function timetableFor(userId: string): Promise<TimetableState | null> {
  const db = getDb();
  const [[row], rows] = await Promise.all([
    db.select({ input: timetable.input }).from(timetable).where(eq(timetable.userId, userId)),
    db.select().from(timetableSession).where(eq(timetableSession.userId, userId)).orderBy(asc(timetableSession.date), asc(timetableSession.startTime)),
  ]);
  if (!row) return null;
  return { input: { ...DEFAULT_INPUT, ...(JSON.parse(row.input) as Partial<TimetableInput>) }, sessions: rows.map(toStored) };
}

export const toStored = (r: typeof timetableSession.$inferSelect): StoredSession =>
  ({ id: r.id, courseId: r.courseId, date: r.date, start: r.startTime, end: r.endTime, review: r.review, auto: r.auto });

const d1 = () => getCloudflareContext().env.DB;

/**
 * Saves the input as it is, without planning. Sessions of a course no longer in it go in the same batch.
 * Raw D1 statements here and below, since Drizzle's batch cannot hold json_each queries.
 */
export async function saveInput(userId: string, input: TimetableInput) {
  const db = d1();
  await db.batch([
    db.prepare(`INSERT INTO timetable (user_id, input, updated_at) VALUES (?1, ?2, ?3)
      ON CONFLICT (user_id) DO UPDATE SET input = excluded.input, updated_at = excluded.updated_at`).bind(userId, JSON.stringify(input), Date.now()),
    db.prepare(`DELETE FROM timetable_session WHERE user_id = ?1 AND course_id NOT IN (SELECT value FROM json_each(?2))`)
      .bind(userId, JSON.stringify(input.courses.map((c) => c.id))),
  ]);
}

/**
 * Runs the planner on the saved timetable: the planner's own sessions from today on are replaced by a new plan
 * that fills the free time around every session the student placed or changed. Past sessions are never touched.
 * The new rows go in as one JSON parameter, which keeps a long plan under D1's bound-parameter limit.
 */
export async function planTimetable(userId: string, t: TimetableState) {
  const today = todayIso();
  const now = new Date();
  const keep = t.sessions.filter((s) => s.date >= today && !s.auto);
  const rows = planSessions(buildPlan(t.input, today, keep, now.getUTCHours() * 60 + now.getUTCMinutes()))
    .map((s) => ({ id: s.id, courseId: s.courseId, date: s.date, start: s.start, end: s.end, review: s.review ? 1 : 0 }));
  const db = d1();
  await db.batch([
    db.prepare(`DELETE FROM timetable_session WHERE user_id = ?1 AND auto = 1 AND date >= ?2`).bind(userId, today),
    db.prepare(`INSERT INTO timetable_session (id, user_id, course_id, date, start_time, end_time, review, auto)
      SELECT json_extract(value, '$.id'), ?1, json_extract(value, '$.courseId'), json_extract(value, '$.date'),
        json_extract(value, '$.start'), json_extract(value, '$.end'), json_extract(value, '$.review'), 1
      FROM json_each(?2)`).bind(userId, JSON.stringify(rows)),
  ]);
  return { sessions: (await timetableFor(userId))!.sessions, added: rows.length };
}
