import { and, eq } from "drizzle-orm";
import { getDb, planCols, planOf, userIdFrom } from "@/lib/auth";
import { promoMailbox, promoRedemption, subscription, user } from "@/db/schema";
import { PAID_PLANS, PLAN_NAMES } from "@/lib/data";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { normalizeCode, promoFor } from "@/lib/promo";

/**
 * One mailbox however it is written: lower case, no +tag, and for Gmail no dots, hashed so the table holds no address.
 */
async function mailboxOf(email: string) {
  const [local, domain = ""] = email.trim().toLowerCase().split("@");
  const gmail = domain === "gmail.com" || domain === "googlemail.com";
  const base = local.split("+")[0];
  const norm = `${gmail ? base.replace(/\./g, "") : base}@${gmail ? "gmail.com" : domain}`;
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(norm)))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// POST /api/promo { code }: redeems a promo code for the signed-in account. Each code works once per account and
// once per mailbox, and adds its plan on top of the account's own plan until the promo runs out.
export async function POST(req: Request) {
  const id = await userIdFrom(req);
  if (!id) return Response.json({ error: "Sign in to use a code." }, { status: 401 });
  // Per account, so codes cannot be guessed quickly.
  const rl = await limited(req, "WRITES", id);
  if (rl) return rl;
  const code = normalizeCode(((await readJson(req)) as { code?: unknown } | null)?.code);
  const promo = code ? promoFor(code) : null;
  if (!promo) return Response.json({ error: "That code is not valid, or has ended." }, { status: 400 });

  const db = getDb();
  const [me] = await db.select({ email: user.email }).from(user).where(eq(user.id, id));
  if (!me) return Response.json({ error: "Sign in to use a code." }, { status: 401 });
  const mailbox = await mailboxOf(me.email);
  const [[used], [usedMailbox], [row]] = await Promise.all([
    db.select({ code: promoRedemption.code }).from(promoRedemption).where(and(eq(promoRedemption.userId, id), eq(promoRedemption.code, code))),
    db.select({ code: promoMailbox.code }).from(promoMailbox).where(and(eq(promoMailbox.mailbox, mailbox), eq(promoMailbox.code, code))),
    db.select(planCols).from(subscription).where(eq(subscription.userId, id)),
  ]);
  if (used || usedMailbox) return Response.json({ error: "You have already used this code." }, { status: 409 });
  if (PAID_PLANS.indexOf(planOf(row) as (typeof PAID_PLANS)[number]) >= PAID_PLANS.indexOf(promo.plan))
    return Response.json({ error: `You already have ${PLAN_NAMES[promo.plan]}.` }, { status: 409 });

  const now = new Date();
  const until = new Date(now.getTime() + promo.days * 86_400_000);
  try {
    // One batch, so the code is only spent if the plan is granted. The redemption's key stops a second use racing in.
    await db.batch([
      db.insert(promoRedemption).values({ userId: id, code, redeemedAt: now }),
      db.insert(promoMailbox).values({ mailbox, code, redeemedAt: now }),
      db.insert(subscription).values({ userId: id, plan: "None", promoPlan: promo.plan, promoUntil: until, updatedAt: now })
        .onConflictDoUpdate({ target: subscription.userId, set: { promoPlan: promo.plan, promoUntil: until, updatedAt: now } }),
    ]);
  } catch {
    return Response.json({ error: "You have already used this code." }, { status: 409 });
  }
  return Response.json({ plan: promo.plan, promoUntil: until.getTime() });
}
