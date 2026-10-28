import { headers } from "next/headers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { isPlan, type Plan } from "@/lib/data";
import type { Me } from "@/lib/profile";

/** Built per request: the D1 binding and secrets only exist inside a Worker request. */
export function getAuth() {
  const { env } = getCloudflareContext();
  return betterAuth({
    database: drizzleAdapter(drizzle(env.DB), { provider: "sqlite", schema }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    socialProviders: {
      google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
    },
  });
}

/** The signed-in user for this request, or null. Cheap enough to call from layouts and pages. */
export async function getSession() {
  // Reading headers first opts the caller into dynamic rendering before the Cloudflare env is touched.
  const h = await headers();
  return getAuth().api.getSession({ headers: h });
}

export function getDb() {
  return drizzle(getCloudflareContext().env.DB, { schema });
}

/** The plan a subscription row grants now: its paid plan, or Pro while a university-email trial runs. */
export function planOf(row: { plan: string; trialEndsAt: Date | null } | undefined, now = new Date()): Plan {
  const paid = row && isPlan(row.plan) ? row.plan : "Free";
  return paid === "Free" && row?.trialEndsAt && row.trialEndsAt > now ? "Pro" : paid;
}

/** The signed-in user's plan from D1; Free for guests and for users with no subscription row. */
export async function getPlan(): Promise<Plan> {
  const s = await getSession();
  if (!s) return "Free";
  const [row] = await getDb().select({ plan: schema.subscription.plan, trialEndsAt: schema.subscription.trialEndsAt }).from(schema.subscription).where(eq(schema.subscription.userId, s.user.id));
  return planOf(row);
}

/** Everything the client shell needs about a user besides their name: profile and subscription. */
export async function meFor(userId: string): Promise<Me> {
  const db = getDb();
  const [[p], [s], [verified], [pending]] = await Promise.all([
    db.select().from(schema.profile).where(eq(schema.profile.userId, userId)),
    db.select().from(schema.subscription).where(eq(schema.subscription.userId, userId)),
    db.select().from(schema.uniEmail).where(eq(schema.uniEmail.userId, userId)),
    db.select().from(schema.uniEmailRequest).where(eq(schema.uniEmailRequest.userId, userId)),
  ]);
  const trialEndsAt = s?.trialEndsAt ?? null;
  const onTrial = s?.plan === "Free" && !!trialEndsAt && trialEndsAt > new Date();
  return {
    profile: p ? {
      ...p, goals: JSON.parse(p.goals) as string[], middleName: p.middleName ?? "", phone: p.phone ?? "", university: p.university ?? "", level: p.level ?? "",
      jobTitle: p.jobTitle ?? "", employer: p.employer ?? "", sector: p.sector ?? "", intent: p.intent ?? "",
    } as Me["profile"] : null,
    subscription: { plan: planOf(s), creditsUsed: s?.creditsUsed ?? 0, creditsExtra: s?.creditsExtra ?? 0, trialEndsAt: trialEndsAt?.getTime() ?? null, onTrial },
    uniEmail: verified ? { email: verified.email, university: verified.university, verified: true, sentAt: null }
      : pending ? { email: pending.email, university: pending.university, verified: false, sentAt: pending.sentAt.getTime() } : null,
  };
}

/** meFor the signed-in user of this request, or null for guests. */
export async function getMe(): Promise<Me | null> {
  const s = await getSession();
  return s ? meFor(s.user.id) : null;
}

/** For route handlers: the signed-in user's id from the request cookies, or null. */
export async function userIdFrom(req: Request) {
  const s = await getAuth().api.getSession({ headers: req.headers });
  return s?.user.id ?? null;
}
