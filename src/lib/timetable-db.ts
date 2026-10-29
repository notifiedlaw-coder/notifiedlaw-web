import { getCloudflareContext } from "@opennextjs/cloudflare";
import { asc, eq } from "drizzle-orm";
import { getDb, planOf } from "@/lib/auth";
import { subscription, timetable, timetableSession } from "@/db/schema";
import { buildPlan, planSessions, todayIso, type StoredSession, type TimetableInput } from "@/lib/timetable";

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
  return { input: JSON.parse(row.input) as TimetableInput, sessions: rows.map(toStored) };
}

export const toStored = (r: typeof timetableSession.$inferSelect): StoredSession =>
  ({ id: r.id, courseId: r.courseId, date: r.date, start: r.startTime, end: r.endTime, review: r.review });

/**
 * Saves the input and rebuilds the plan from today on, in one batch: sessions from today, and any for a course
 * no longer in the timetable, are replaced by the new plan. Past sessions of kept courses stay as they were.
 */
export async function saveTimetable(userId: string, input: TimetableInput) {
  const today = todayIso();
  const rows = planSessions(buildPlan(input, today)).map((s) => ({ id: s.id, courseId: s.courseId, date: s.date, start: s.start, end: s.end, review: s.review ? 1 : 0 }));
  const ids = input.courses.map((c) => c.id);
  // Raw D1 statements, since Drizzle's batch cannot hold the json_each insert. The plan goes in as one JSON
  // parameter, which keeps a long plan under D1's bound-parameter limit.
  const d1 = getCloudflareContext().env.DB;
  await d1.batch([
    d1.prepare(`INSERT INTO timetable (user_id, input, updated_at) VALUES (?1, ?2, ?3)
      ON CONFLICT (user_id) DO UPDATE SET input = excluded.input, updated_at = excluded.updated_at`).bind(userId, JSON.stringify(input), Date.now()),
    d1.prepare(`DELETE FROM timetable_session WHERE user_id = ?1 AND (date >= ?2 OR course_id NOT IN (SELECT value FROM json_each(?3)))`)
      .bind(userId, today, JSON.stringify(ids)),
    d1.prepare(`INSERT INTO timetable_session (id, user_id, course_id, date, start_time, end_time, review)
      SELECT json_extract(value, '$.id'), ?1, json_extract(value, '$.courseId'), json_extract(value, '$.date'),
        json_extract(value, '$.start'), json_extract(value, '$.end'), json_extract(value, '$.review')
      FROM json_each(?2)`).bind(userId, JSON.stringify(rows)),
  ]);
  return (await timetableFor(userId))!;
}
