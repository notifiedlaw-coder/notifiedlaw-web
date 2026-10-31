import { headers } from "next/headers";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins/magic-link";
import { getSessionCookie } from "better-auth/cookies";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { and, eq, inArray, lt, ne } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { Plan } from "@/lib/data";
import { effectivePlan } from "@/lib/promo";
import { avatarUrl } from "@/lib/friend-view";
import { sendEmail, studentLinkMessage } from "@/lib/email";
import { limitedBy } from "@/lib/rate-limit";
import { TURNSTILE_HEADER, verifyTurnstile } from "@/lib/turnstile";
import { DAILY_SENDS, LINK_MINUTES, RESEND_SECONDS, checkStudentEmail, studentEligible } from "@/lib/student";
import { accountName, type Me } from "@/lib/profile";

/** Built per request: the D1 binding and secrets only exist inside a Worker request. */
export function getAuth() {
  const { env } = getCloudflareContext();
  const db = drizzle(env.DB, { schema });
  return betterAuth({
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    // Endpoints the app never calls. Accounts are one Google login or one university email, so linking, email
    // changes and handing out the stored Google tokens are switched off rather than left reachable.
    disabledPaths: ["/link-social", "/unlink-account", "/list-accounts", "/account-info", "/change-email", "/get-access-token", "/refresh-token"],
    // Professionals sign up with Google. Students sign up and sign in with a link sent to their university email.
    socialProviders: {
      google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
    },
    plugins: [
      magicLink({
        expiresIn: LINK_MINUTES * 60,
        storeToken: "hashed",
        sendMagicLink: async ({ email, token }, ctx) => sendStudentLink(db, email, token, ctx?.request?.headers ?? ctx?.headers),
      }),
    ],
    databaseHooks: {
      // Other people see this name, so it follows the profile form's rules on every write path, including Better
      // Auth's own update-user endpoint and the name a sign-up passes in. A name from Google that does not fit is
      // left empty until onboarding sets one.
      user: {
        create: { before: async (u) => ({ data: { ...u, name: accountName(u.name) ?? "" } }) },
        update: {
          // user.image is never shown (pictures are userAvatar), so update-user cannot set it to an arbitrary string.
          before: async (data) => {
            const u = { ...data };
            delete u.image;
            if (u.name === undefined) return { data: u };
            const name = accountName(u.name);
            if (!name) throw refuse("Names can only contain letters, spaces, hyphens, apostrophes and full stops.");
            return { data: { ...u, name } };
          },
        },
      },
      session: {
        // One device at a time: a new sign-in ends every other session of the account, so the old device is
        // signed out on its next request and /login tells it why (signedOutElsewhere). Any sign-in to an account whose email is on a university domain also
        // proves the mailbox is still live, whether it came from the emailed link or from Google on a Workspace university.
        create: {
          after: async (s) => {
            await endOtherSessions(db, s.userId, s.id);
            await recordStudent(db, s.userId);
          },
        },
      },
    },
    user: {
      // Settings > Delete account. Accounts have no password, so Better Auth instead refuses unless the session
      // was created in the last day (freshAge). D1 rows go by cascade. Before that, the account's calls are ended
      // at the SFU and the pictures of groups it owns are removed, since both are found through rows the cascade
      // deletes; its own R2 objects are removed afterwards, by key prefix. The imports are lazy because both
      // modules import this file.
      deleteUser: {
        enabled: true,
        beforeDelete: async (u) => {
          await (await import("@/lib/calls")).endCallsOf(u.id);
          const { purgePrefix } = await import("@/lib/files");
          const owned = await db.select({ id: schema.chatGroup.id }).from(schema.chatGroup).where(eq(schema.chatGroup.ownerId, u.id));
          for (const g of owned) await purgePrefix(`avatars/g/${g.id}/`);
        },
        afterDelete: async (u) => {
          await (await import("@/lib/files")).purgeUserObjects(u.id);
          // Keyed by email, so it does not cascade: the send counter for this address goes with the account.
          await db.delete(schema.studentLink).where(eq(schema.studentLink.email, u.email.trim().toLowerCase()));
        },
      },
    },
  });
}

type Db = ReturnType<typeof drizzle<typeof schema>>;
const refuse = (message: string, status: "BAD_REQUEST" | "TOO_MANY_REQUESTS" = "BAD_REQUEST") => new APIError(status, { message });

/**
 * Emails a student sign-in link. Only normalised addresses at a supported university get one. Limits: one link a
 * minute and DAILY_SENDS a day per address (D1), plus RL_UNI_EMAIL per address and per IP, so nobody can flood
 * an inbox or probe addresses quickly. A Turnstile check comes first, so a script cannot send links to made-up
 * addresses (which still cost a send when they bounce). The link opens /verify-email, which signs in only on a button press, so
 * mail scanners that fetch links do not use up the token.
 */
async function sendStudentLink(db: Db, email: string, token: string, h?: Headers) {
  const checked = checkStudentEmail(email);
  if ("error" in checked) throw refuse(checked.error);
  if (checked.email !== email) throw refuse("Enter your university email without capitals or a +tag.");
  if (!(await verifyTurnstile(h?.get(TURNSTILE_HEADER), h?.get("cf-connecting-ip"))))
    throw refuse("We could not confirm you are human. Complete the check and try again.");
  const burst = await limitedBy("UNI_EMAIL", [`to:${email}`, `ip:${h?.get("cf-connecting-ip") ?? "anon"}`]);
  if (burst) throw refuse("Too many requests. Wait a minute and try again.", "TOO_MANY_REQUESTS");
  const now = new Date();
  const [last] = await db.select().from(schema.studentLink).where(eq(schema.studentLink.email, email));
  if (last && now.getTime() - last.sentAt.getTime() < RESEND_SECONDS * 1000)
    throw refuse("A link was just sent. Wait a minute before sending another.", "TOO_MANY_REQUESTS");
  const fresh = !last || now.getTime() - last.windowStart.getTime() >= 86_400_000;
  const sends = fresh ? 1 : last.sends + 1;
  if (sends > DAILY_SENDS) throw refuse(`This address has had ${DAILY_SENDS} links today. Try again tomorrow.`, "TOO_MANY_REQUESTS");
  const row = { sentAt: now, sends, windowStart: fresh ? now : last.windowStart };
  await db.insert(schema.studentLink).values({ email, ...row }).onConflictDoUpdate({ target: schema.studentLink.email, set: row });

  // The configured origin, never the request's: a link built from Host could send the token somewhere else.
  const link = `${new URL(getCloudflareContext().env.BETTER_AUTH_URL).origin}/verify-email?token=${encodeURIComponent(token)}`;
  if (process.env.NODE_ENV !== "production") console.info(`[student] sign-in link for ${email}: ${link}`);
  try {
    await sendEmail({ to: email, ...studentLinkMessage(link, checked.university, LINK_MINUTES) });
  } catch (e) {
    console.error("[student] send failed", (e as { code?: string }).code, (e as Error).message);
    throw refuse("We could not send the email. Check the address and try again shortly.");
  }
}

const ENDED_KEEP_MS = 30 * 86_400_000; // longer than any session lasts

const sha256 = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");

/** Deletes the user's sessions other than `keepId`, noting each one's token hash for signedOutElsewhere. */
async function endOtherSessions(db: Db, userId: string, keepId: string) {
  const others = await db.select({ id: schema.session.id, token: schema.session.token }).from(schema.session)
    .where(and(eq(schema.session.userId, userId), ne(schema.session.id, keepId)));
  const now = new Date();
  await db.delete(schema.endedSession).where(lt(schema.endedSession.endedAt, new Date(now.getTime() - ENDED_KEEP_MS)));
  if (!others.length) return;
  // D1 binds at most 100 values per query; a user rarely has more than one other session.
  for (let i = 0; i < others.length; i += 40) {
    const part = others.slice(i, i + 40);
    const rows = await Promise.all(part.map(async (o) => ({ tokenHash: await sha256(o.token), endedAt: now })));
    await db.insert(schema.endedSession).values(rows).onConflictDoNothing();
    await db.delete(schema.session).where(inArray(schema.session.id, part.map((o) => o.id)));
  }
}

/**
 * True when this browser's session cookie belongs to a session that was ended because the account signed in on
 * another device. Only call it once getSession found no session.
 */
export async function signedOutElsewhere() {
  const raw = getSessionCookie(await headers());
  if (!raw) return false;
  let value = raw;
  try { value = decodeURIComponent(raw); } catch { /* use as is */ }
  const dot = value.lastIndexOf(".");
  if (dot < 1) return false;
  const [row] = await getDb().select({ endedAt: schema.endedSession.endedAt }).from(schema.endedSession)
    .where(eq(schema.endedSession.tokenHash, await sha256(value.slice(0, dot))));
  return !!row;
}

/**
 * Marks the user a student, or refreshes their proof, when their verified email is on a university domain. The
 * address must already be in normalised form, the same rule the emailed link applies, so a Google account at
 * name+1@ cannot claim a second student record for one mailbox.
 */
async function recordStudent(db: Db, userId: string) {
  const [u] = await db.select({ email: schema.user.email, verified: schema.user.emailVerified }).from(schema.user).where(eq(schema.user.id, userId));
  if (!u?.verified) return;
  const checked = checkStudentEmail(u.email);
  if ("error" in checked || checked.email !== u.email.trim().toLowerCase()) return;
  const { email, university } = checked;
  const now = new Date();
  await db.insert(schema.student).values({ userId, email, university, verifiedAt: now })
    .onConflictDoUpdate({ target: schema.student.userId, set: { verifiedAt: now } });
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

/** The plan a subscription row grants: its paid plan or a live promo plan, whichever is higher; else None. */
export const planOf = (row: { plan: string; promoPlan?: string | null; promoUntil?: Date | null } | undefined): Plan => effectivePlan(row);
/** The subscription columns planOf needs. */
export const planCols = { plan: schema.subscription.plan, promoPlan: schema.subscription.promoPlan, promoUntil: schema.subscription.promoUntil };

/** The signed-in user's plan from D1; None for guests and for users who have not paid. */
export async function getPlan(): Promise<Plan> {
  const s = await getSession();
  return s ? planFor(s.user.id) : "None";
}

/** One account's plan, for code that already holds the user id and must check that same account. */
export async function planFor(userId: string): Promise<Plan> {
  const [row] = await getDb().select(planCols).from(schema.subscription).where(eq(schema.subscription.userId, userId));
  return planOf(row);
}

/** The user's student record, or null for professional accounts. */
export async function studentOf(userId: string) {
  const [row] = await getDb().select().from(schema.student).where(eq(schema.student.userId, userId));
  return row ?? null;
}

/** Everything the client shell needs about a user besides their name: profile, subscription and student status. */
export async function meFor(userId: string): Promise<Me> {
  const db = getDb();
  const [[p], [s], st, [av]] = await Promise.all([
    db.select().from(schema.profile).where(eq(schema.profile.userId, userId)),
    db.select().from(schema.subscription).where(eq(schema.subscription.userId, userId)),
    studentOf(userId),
    db.select({ key: schema.userAvatar.key }).from(schema.userAvatar).where(eq(schema.userAvatar.userId, userId)),
  ]);
  return {
    profile: p ? {
      ...p, goals: JSON.parse(p.goals) as string[], middleName: p.middleName ?? "", phone: p.phone ?? "", university: p.university ?? "", level: p.level ?? "",
      jobTitle: p.jobTitle ?? "", employer: p.employer ?? "", sector: p.sector ?? "", intent: p.intent ?? "",
    } as Me["profile"] : null,
    subscription: { plan: planOf(s), creditsUsed: s?.creditsUsed ?? 0, promoUntil: s?.promoUntil && planOf(s) !== planOf({ plan: s.plan }) ? s.promoUntil.getTime() : null },
    student: st ? {
      email: st.email, university: st.university, studentId: st.studentId ?? "",
      verifiedAt: st.verifiedAt.getTime(), eligible: studentEligible(st.verifiedAt.getTime()),
    } : null,
    avatar: avatarUrl(av?.key),
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
