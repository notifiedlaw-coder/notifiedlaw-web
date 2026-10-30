import { and, eq } from "drizzle-orm";
import { caseBookmark } from "@/db/schema";
import { getDb, getSession } from "@/lib/auth";

/** Ids of the case briefs a user has bookmarked. */
export async function bookmarkedCases(userId: string): Promise<string[]> {
  const rows = await getDb().select({ caseId: caseBookmark.caseId }).from(caseBookmark).where(eq(caseBookmark.userId, userId));
  return rows.map((r) => r.caseId);
}

/** For server pages: the signed-in user's bookmarked cases, or null for a guest, who cannot keep any. */
export async function myBookmarks(): Promise<string[] | null> {
  const s = await getSession();
  return s ? bookmarkedCases(s.user.id) : null;
}

/** Bookmarks a case, or removes the bookmark. Bookmarking it again leaves the first date. */
export async function setBookmark(userId: string, caseId: string, on: boolean) {
  const db = getDb();
  if (on) await db.insert(caseBookmark).values({ userId, caseId, createdAt: new Date() }).onConflictDoNothing();
  else await db.delete(caseBookmark).where(and(eq(caseBookmark.userId, userId), eq(caseBookmark.caseId, caseId)));
}
