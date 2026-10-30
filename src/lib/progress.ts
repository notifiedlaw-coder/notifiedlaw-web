import { and, eq } from "drizzle-orm";
import { topicProgress } from "@/db/schema";
import { getDb, getSession } from "@/lib/auth";

/** Ids of the topics a user has marked as studied. */
export async function completedTopics(userId: string): Promise<string[]> {
  const rows = await getDb().select({ topicId: topicProgress.topicId }).from(topicProgress).where(eq(topicProgress.userId, userId));
  return rows.map((r) => r.topicId);
}

/** For server pages: the signed-in user's studied topics, or null for a guest, who cannot keep any. */
export async function myCompleted(): Promise<string[] | null> {
  const s = await getSession();
  return s ? completedTopics(s.user.id) : null;
}

/** Marks a topic as studied, or not. Marking it again leaves the first date. */
export async function setCompleted(userId: string, topicId: string, done: boolean) {
  const db = getDb();
  if (done) await db.insert(topicProgress).values({ userId, topicId, completedAt: new Date() }).onConflictDoNothing();
  else await db.delete(topicProgress).where(and(eq(topicProgress.userId, userId), eq(topicProgress.topicId, topicId)));
}
