import { headers } from "next/headers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/db/schema";

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
