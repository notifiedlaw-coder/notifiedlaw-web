import { sql, eq } from "drizzle-orm";
import { quote } from "@/db/schema";
import { getDb } from "@/lib/auth";

export type Quote = { text: string; author: string; source: string | null };

/** One active quote picked at random, or null if there are none or D1 cannot be read. */
export async function randomQuote(): Promise<Quote | null> {
  try {
    const [q] = await getDb().select({ text: quote.text, author: quote.author, source: quote.source })
      .from(quote).where(eq(quote.active, true)).orderBy(sql`random()`).limit(1);
    return q ?? null;
  } catch {
    return null;
  }
}
