import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/auth";
import { subscription, uniEmail, uniEmailRequest } from "@/db/schema";
import { clientIp, limited, limitedBy } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { hashToken } from "@/lib/token";
import { TRIAL_DAYS } from "@/lib/uni-email";

const fail = (error: string, status: number) => Response.json({ error }, { status });

/**
 * Confirms a university email from the emailed link. The token is the proof, so no session is needed (the
 * link is often opened on another device). Claiming the address, clearing the link and starting the trial
 * run as one batch, and the trial is only ever set once per account.
 */
export async function POST(req: Request) {
  const rl = (await limited(req, "WRITES")) ?? (await limitedBy("UNI_EMAIL", [`ip:${clientIp(req)}`]));
  if (rl) return rl;
  const token = ((await readJson(req)) as { token?: unknown } | null)?.token;
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return fail("This link is not valid.", 400);
  const db = getDb();
  const [pending] = await db.select().from(uniEmailRequest).where(eq(uniEmailRequest.tokenHash, await hashToken(token)));
  const now = new Date();
  if (!pending || pending.expiresAt <= now) return fail("This link has expired or was already used. Send a new one from Settings.", 400);
  const clear = db.delete(uniEmailRequest).where(eq(uniEmailRequest.userId, pending.userId));

  const [[taken], [mine]] = await Promise.all([
    db.select({ userId: uniEmail.userId }).from(uniEmail).where(eq(uniEmail.email, pending.email)),
    db.select({ email: uniEmail.email }).from(uniEmail).where(eq(uniEmail.userId, pending.userId)),
  ]);
  if (mine) { await clear; return Response.json({ ok: true, already: true }); }
  if (taken) { await clear; return fail("This university email is already linked to another NotifiedLaw account.", 409); }

  const ends = new Date(now.getTime() + TRIAL_DAYS * 86_400_000);
  try {
    await db.batch([
      db.insert(uniEmail).values({ email: pending.email, userId: pending.userId, university: pending.university, verifiedAt: now }),
      clear,
      // coalesce keeps an earlier trial date, so an account never gets a second trial.
      db.insert(subscription).values({ userId: pending.userId, trialEndsAt: ends, updatedAt: now })
        .onConflictDoUpdate({ target: subscription.userId, set: { trialEndsAt: sql`coalesce(${subscription.trialEndsAt}, ${ends.getTime()})`, updatedAt: now } }),
    ]);
  } catch {
    // Lost a race with another account claiming the same address, or this account verifying twice at once.
    return fail("This university email is already linked to another NotifiedLaw account.", 409);
  }
  const [s] = await db.select({ trialEndsAt: subscription.trialEndsAt }).from(subscription).where(eq(subscription.userId, pending.userId));
  return Response.json({ ok: true, trialEndsAt: s?.trialEndsAt?.getTime() ?? null });
}
