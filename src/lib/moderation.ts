import { and, eq, gt, inArray, or, sql } from "drizzle-orm";
import { abuseReport, chatGroup, friendship, groupMember, groupMessage, message, userBlock } from "@/db/schema";
import { getDb } from "@/lib/auth";
import { people } from "@/lib/friends";
import { pairOf } from "@/lib/messages";
import { endCallsBetween, leaveGroupCalls } from "@/lib/calls";

export const REPORT_KINDS = ["user", "group", "message", "group_message"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];
export const REPORT_REASONS = ["Harassment or bullying", "Hate speech", "Sexual content", "Spam or scams", "Threats or violence", "Something else"] as const;
/** Reports one account can file in a day, so reporting cannot itself be used to flood the review queue. */
const DAILY_REPORTS = 20;

/**
 * Blocks an account: ends any friendship (and with it the conversation), takes the blocked account out of the
 * blocker's groups and the blocker out of the blocked account's groups. From then on neither can find the other by
 * email, message, call or add the other to a group. The block and the end of the friendship are one batch, so a
 * request accepted in between cannot leave them friends; calls between them, or with either in the other's group, end.
 */
export async function block(userId: string, otherId: string) {
  const db = getDb();
  const between = or(and(eq(friendship.fromId, userId), eq(friendship.toId, otherId)), and(eq(friendship.fromId, otherId), eq(friendship.toId, userId)));
  await db.batch([
    db.insert(userBlock).values({ blockerId: userId, blockedId: otherId, createdAt: new Date() }).onConflictDoNothing(),
    db.delete(friendship).where(between),
    db.delete(message).where(pairOf(userId, otherId)),
  ]);
  const [mine, theirs] = await Promise.all([
    db.select({ id: chatGroup.id }).from(chatGroup).where(eq(chatGroup.ownerId, userId)),
    db.select({ id: chatGroup.id }).from(chatGroup).where(eq(chatGroup.ownerId, otherId)),
  ]);
  const out = [
    ...(mine.length ? [db.delete(groupMember).where(and(eq(groupMember.userId, otherId), inArray(groupMember.groupId, mine.map((g) => g.id))))] : []),
    ...(theirs.length ? [db.delete(groupMember).where(and(eq(groupMember.userId, userId), inArray(groupMember.groupId, theirs.map((g) => g.id))))] : []),
  ];
  for (const q of out) await q;
  await endCallsBetween(userId, otherId);
  await leaveGroupCalls(otherId, mine.map((g) => g.id));
  await leaveGroupCalls(userId, theirs.map((g) => g.id));
}

export async function unblock(userId: string, otherId: string) {
  await getDb().delete(userBlock).where(and(eq(userBlock.blockerId, userId), eq(userBlock.blockedId, otherId)));
}

/** The accounts a user has blocked, to unblock from the Friends page. */
export async function blockedBy(userId: string) {
  const rows = await getDb().select({ id: userBlock.blockedId }).from(userBlock).where(eq(userBlock.blockerId, userId));
  const names = await people(rows.map((r) => r.id));
  return rows.map((r) => ({ id: r.id, name: names.get(r.id)?.name ?? "Notified Law user", avatar: names.get(r.id)?.avatar ?? null }));
}

/**
 * Files a report. A reported message is copied into the report, since messages expire, but only one the reporter
 * could see: their own conversation, or a group they are in. Returns an error message, or null.
 */
export async function report(userId: string, kind: ReportKind, target: string, reason: string): Promise<string | null> {
  const db = getDb();
  const [today] = await db.select({ n: sql<number>`count(*)` }).from(abuseReport)
    .where(and(eq(abuseReport.reporterId, userId), gt(abuseReport.createdAt, new Date(Date.now() - 86_400_000))));
  if ((today?.n ?? 0) >= DAILY_REPORTS) return "You have sent a lot of reports today. Try again tomorrow.";
  let snapshot: string | null = null;
  if (kind === "message") {
    const [m] = await db.select().from(message).where(and(eq(message.id, target), or(eq(message.fromId, userId), eq(message.toId, userId))));
    if (!m) return "That message is no longer available.";
    snapshot = JSON.stringify({ from: m.fromId, to: m.toId, body: m.body, at: m.createdAt.getTime() });
  } else if (kind === "group_message") {
    const [m] = await db.select({ m: groupMessage }).from(groupMessage)
      .innerJoin(groupMember, and(eq(groupMember.groupId, groupMessage.groupId), eq(groupMember.userId, userId)))
      .where(eq(groupMessage.id, target));
    if (!m) return "That message is no longer available.";
    snapshot = JSON.stringify({ group: m.m.groupId, from: m.m.fromId, body: m.m.body, at: m.m.createdAt.getTime() });
  } else if (kind === "group") {
    const [g] = await db.select().from(chatGroup).where(eq(chatGroup.id, target));
    if (!g) return "That group no longer exists.";
    snapshot = JSON.stringify({ name: g.name, owner: g.ownerId, avatar: g.avatarKey });
  }
  await db.insert(abuseReport).values({ id: crypto.randomUUID(), reporterId: userId, kind, target, reason, snapshot, createdAt: new Date() });
  return null;
}
