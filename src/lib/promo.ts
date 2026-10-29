import { PAID_PLANS, type PaidPlan } from "@/lib/data";

// Promo codes: each grants a plan for a number of days, once per account, until the code's last day.
type Promo = { plan: PaidPlan; days: number; lastDay: string }; // lastDay: YYYY-MM-DD, Accra time (UTC)
const PROMOS: Record<string, Promo> = {
  NOTIFIEDLAW26: { plan: "Pro Max", days: 21, lastDay: "2026-12-31" },
};

/** Codes are typed in any case, with stray spaces. */
export const normalizeCode = (raw: unknown) => (typeof raw === "string" ? raw.replace(/\s+/g, "").toUpperCase().slice(0, 40) : "");

/** The promo behind a code, if it exists and can still be used at `now`. */
export function promoFor(code: string, now = Date.now()): Promo | null {
  const p = PROMOS[code];
  return p && now < Date.parse(p.lastDay) + 86_400_000 ? p : null;
}

/** The plan a subscription row gives: the better of its own plan and a promo plan that has not run out. */
export function effectivePlan(row: { plan: string; promoPlan?: string | null; promoUntil?: Date | null } | undefined, now = Date.now()): PaidPlan | "None" {
  if (!row) return "None";
  const own = PAID_PLANS.indexOf(row.plan as PaidPlan);
  const promo = row.promoUntil && row.promoUntil.getTime() > now ? PAID_PLANS.indexOf(row.promoPlan as PaidPlan) : -1;
  const best = Math.max(own, promo);
  return best < 0 ? "None" : PAID_PLANS[best];
}
