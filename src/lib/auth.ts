import { headers } from "next/headers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { isPlan, type Plan } from "@/lib/data";

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

/** The signed-in user's plan from D1; Free for guests and for users with no subscription row. */
export async function getPlan(): Promise<Plan> {
  const s = await getSession();
  if (!s) return "Free";
  const [row] = await getDb().select({ plan: schema.subscription.plan }).from(schema.subscription).where(eq(schema.subscription.userId, s.user.id));
  return row && isPlan(row.plan) ? row.plan : "Free";
}

/** For route handlers: the signed-in user's id from the request cookies, or null. */
export async function userIdFrom(req: Request) {
  const s = await getAuth().api.getSession({ headers: req.headers });
  return s?.user.id ?? null;
}
