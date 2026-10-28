import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, userIdFrom } from "@/lib/auth";
import { profile, uniEmail, uniEmailRequest } from "@/db/schema";
import { clientIp, limited, limitedBy } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { sendEmail, uniEmailMessage } from "@/lib/email";
import { newToken } from "@/lib/token";
import { DAILY_SENDS, LINK_MINUTES, RESEND_SECONDS, checkUniEmail } from "@/lib/uni-email";

const fail = (error: string, status: number) => Response.json({ error }, { status });

/**
 * Sends a verification link to a university email. The address must be on the profile university's domains,
 * must not already be verified by any account, and each account can verify only one.
 * Limits: one link a minute and DAILY_SENDS a day per account (D1), plus RL_UNI_EMAIL per account, per IP and
 * per recipient, so many accounts cannot flood one inbox.
 */
export async function POST(req: Request) {
  const id = await userIdFrom(req);
  if (!id) return fail("unauthenticated", 401);
  const rl = await limited(req, "WRITES", id);
  if (rl) return rl;
  const body = (await readJson(req)) as { email?: unknown } | null;
  const db = getDb();
  const [[p], [mine], [pending]] = await Promise.all([
    db.select({ university: profile.university }).from(profile).where(eq(profile.userId, id)),
    db.select().from(uniEmail).where(eq(uniEmail.userId, id)),
    db.select().from(uniEmailRequest).where(eq(uniEmailRequest.userId, id)),
  ]);
  if (mine) return fail("Your account already has a verified university email.", 409);
  if (!p?.university) return fail("Choose your university in your profile first.", 400);
  const checked = checkUniEmail(body?.email, p.university);
  if ("error" in checked) return fail(checked.error, 400);
  const now = new Date();
  if (pending && now.getTime() - pending.sentAt.getTime() < RESEND_SECONDS * 1000)
    return fail("A link was just sent. Wait a minute before sending another.", 429);
  const fresh = !pending?.windowStart || now.getTime() - pending.windowStart.getTime() >= 86_400_000;
  const sends = fresh ? 1 : pending.sends + 1;
  if (sends > DAILY_SENDS) return fail(`You can send ${DAILY_SENDS} verification emails a day. Try again tomorrow.`, 429);
  const burst = await limitedBy("UNI_EMAIL", [`user:${id}`, `ip:${clientIp(req)}`, `to:${checked.email}`]);
  if (burst) return burst;
  const [taken] = await db.select({ userId: uniEmail.userId }).from(uniEmail).where(eq(uniEmail.email, checked.email));
  if (taken) return fail("This university email is already linked to another NotifiedLaw account.", 409);

  const { token, hash } = await newToken();
  const row = {
    email: checked.email, university: p.university, tokenHash: hash, expiresAt: new Date(now.getTime() + LINK_MINUTES * 60_000), sentAt: now,
    sends, windowStart: fresh ? now : pending!.windowStart,
  };
  // Replacing the row also retires any earlier link.
  await db.insert(uniEmailRequest).values({ userId: id, ...row }).onConflictDoUpdate({ target: uniEmailRequest.userId, set: row });
  // The configured origin, never the request's: a link built from Host could point the token somewhere else.
  const link = `${new URL(getCloudflareContext().env.BETTER_AUTH_URL).origin}/verify-uni?token=${token}`;
  if (process.env.NODE_ENV !== "production") console.info(`[uni-email] verification link for ${checked.email}: ${link}`);
  try {
    await sendEmail({ to: checked.email, ...uniEmailMessage(link, p.university, LINK_MINUTES) });
  } catch (e) {
    console.error("[uni-email] send failed", (e as { code?: string }).code, (e as Error).message);
    return fail("We could not send the email. Check the address and try again shortly.", 502);
  }
  return Response.json({ ok: true, uniEmail: { email: checked.email, university: p.university, verified: false, sentAt: now.getTime() } });
}
