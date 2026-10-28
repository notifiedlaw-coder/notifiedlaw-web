import { sql, eq } from "drizzle-orm";
import { quote } from "@/db/schema";
import { getDb } from "@/lib/auth";

export type Quote = { text: string; author: string; source: string | null };

/** The quote of the day: one active quote that changes once a day (UTC, same as Accra) and not on refresh. */
export async function dailyQuote(): Promise<Quote | null> {
  try {
    const db = getDb();
    const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(quote).where(eq(quote.active, true));
    if (!n) return null;
    const day = Math.floor(Date.now() / 86_400_000);
    const [q] = await db.select({ text: quote.text, author: quote.author, source: quote.source })
      .from(quote).where(eq(quote.active, true)).orderBy(quote.id).limit(1).offset(day % n);
    return q ?? null;
  } catch {
    return null;
  }
}
