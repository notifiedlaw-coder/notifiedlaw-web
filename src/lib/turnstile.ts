import { getCloudflareContext } from "@opennextjs/cloudflare";

export { TURNSTILE_HEADER } from "@/lib/site";

/**
 * Checks a Turnstile token with Cloudflare's Siteverify. Each token works once and for five minutes. Fails closed in
 * production; under `next dev` with no TURNSTILE_SECRET_KEY set, the check is skipped.
 */
export async function verifyTurnstile(token: string | null | undefined, ip: string | null | undefined) {
  const secret = getCloudflareContext().env.TURNSTILE_SECRET_KEY as string | undefined;
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!token || token.length > 2048) return false;
  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const r = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!r.success) console.warn("[turnstile] refused", r["error-codes"]);
    return r.success === true;
  } catch (e) {
    console.error("[turnstile] siteverify failed", (e as Error).message);
    return false;
  }
}
