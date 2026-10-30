import { eq, lt, ne, or, sql } from "drizzle-orm";
import { activity } from "@/db/schema";
import { getDb } from "@/lib/auth";
import { dayOf, liveStreak } from "@/lib/friend-view";

/** Heartbeats closer together than this on the same day are not written. */
const MIN_WRITE_MS = 60_000;

/** Marks the user as seen now and counts today towards their streak: +1 after yesterday, back to 1 after a gap. */
export async function recordActivity(userId: string) {
  const now = Date.now();
  const today = dayOf(now);
  const yesterday = dayOf(now - 86_400_000);
  // On conflict every column reference reads the stored row, so `next` is worked out from yesterday's values.
  const next = sql`CASE WHEN ${activity.streakDay} = ${today} THEN ${activity.streak} WHEN ${activity.streakDay} = ${yesterday} THEN ${activity.streak} + 1 ELSE 1 END`;
  await getDb().insert(activity).values({ userId, lastSeenAt: new Date(now), streak: 1, bestStreak: 1, streakDay: today })
    .onConflictDoUpdate({
      target: activity.userId,
      set: { lastSeenAt: new Date(now), streak: next, bestStreak: sql`max(${activity.bestStreak}, ${next})`, streakDay: today },
      setWhere: or(lt(activity.lastSeenAt, new Date(now - MIN_WRITE_MS)), ne(activity.streakDay, today)),
    });
}

/** The user's own streak as it stands today, and their best. */
export async function myStreak(userId: string) {
  const [row] = await getDb().select().from(activity).where(eq(activity.userId, userId));
  return row ? { streak: liveStreak(row.streak, row.streakDay), best: row.bestStreak } : { streak: 0, best: 0 };
}
