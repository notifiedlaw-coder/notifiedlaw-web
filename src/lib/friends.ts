import { and, eq, inArray, or, sql } from "drizzle-orm";
import { activity, friendship, message, profile, student, user, userAvatar, userBlock } from "@/db/schema";
import { getDb } from "@/lib/auth";
import { pairOf } from "@/lib/messages";
import { avatarUrl, dayOf, liveStreak, type Friend, type FriendLists } from "@/lib/friend-view";

/** Friends, requests received and requests sent, together, per account. Keeps lists and sheets short. */
export const MAX_FRIENDS = 100;
/** Shown for an account that has not set up a profile, whose sign-in name has not been through the name rules. */
const NO_NAME = "Notified Law user";


/** The other side of each of a user's friendship rows, named as onboarding recorded them, with their activity. */
async function others(userId: string, side: "from" | "to") {
  const mine = side === "from" ? friendship.fromId : friendship.toId;
  const theirs = side === "from" ? friendship.toId : friendship.fromId;
  return getDb()
    .select({
      id: user.id, name: user.name, email: user.email, first: profile.firstName, last: profile.lastName,
      university: profile.university, studentUni: student.university, status: friendship.status, at: friendship.createdAt,
      lastSeen: activity.lastSeenAt, streak: activity.streak, best: activity.bestStreak, streakDay: activity.streakDay, avatar: userAvatar.key,
    })
    .from(friendship)
    .innerJoin(user, eq(user.id, theirs))
    .leftJoin(profile, eq(profile.userId, user.id))
    .leftJoin(student, eq(student.userId, user.id))
    .leftJoin(activity, eq(activity.userId, user.id))
    .leftJoin(userAvatar, eq(userAvatar.userId, user.id))
    .where(eq(mine, userId))
    .limit(MAX_FRIENDS * 2);
}

type Row = Awaited<ReturnType<typeof others>>[number] & { fromSide?: boolean };
/**
 * Activity is shown only between friends; a request received shows the name and school alone. A request sent shows
 * only the email the sender typed, so typing someone's address does not reveal who owns it before they accept.
 */
function view(r: Row): Friend {
  if (r.status === "pending" && r.fromSide) return { id: r.id, name: r.email, school: null, avatar: null, lastSeen: null, streak: 0, best: 0, today: false };
  const friend = r.status === "accepted" && r.streakDay !== null;
  return {
    id: r.id, name: r.first ? `${r.first} ${r.last}` : NO_NAME, school: r.studentUni ?? r.university ?? null, avatar: avatarUrl(r.avatar),
    lastSeen: friend ? r.lastSeen!.getTime() : null,
    streak: friend ? liveStreak(r.streak!, r.streakDay!) : 0,
    best: friend ? r.best! : 0,
    today: friend && r.streakDay === dayOf(Date.now()),
  };
}
const byName = (a: Friend, b: Friend) => a.name.localeCompare(b.name);

/** Everyone a user is friends with or has a request open with. */
export async function friendLists(userId: string): Promise<FriendLists> {
  const [sentRows, got] = await Promise.all([others(userId, "from"), others(userId, "to")]);
  const sent = sentRows.map((r) => ({ ...r, fromSide: true }));
  return {
    friends: [...sent, ...got].filter((r) => r.status === "accepted").map(view).sort(byName),
    incoming: got.filter((r) => r.status === "pending").sort((a, b) => b.at.getTime() - a.at.getTime()).map(view),
    outgoing: sent.filter((r) => r.status === "pending").sort((a, b) => b.at.getTime() - a.at.getTime()).map(view),
  };
}

const between = (a: string, b: string) => or(and(eq(friendship.fromId, a), eq(friendship.toId, b)), and(eq(friendship.fromId, b), eq(friendship.toId, a)));
/** Friend requests waiting on the user, for the badge on the friends button. */
export async function incomingCount(userId: string) {
  const [r] = await getDb().select({ n: sql<number>`count(*)` }).from(friendship).where(and(eq(friendship.toId, userId), eq(friendship.status, "pending")));
  return r?.n ?? 0;
}

const count = async (userId: string) => {
  const [r] = await getDb().select({ n: sql<number>`count(*)` }).from(friendship).where(or(eq(friendship.fromId, userId), eq(friendship.toId, userId)));
  return r?.n ?? 0;
};

/**
 * Sends a friend request to the account with this email. If that person already asked, it accepts theirs instead.
 * Returns an error message for the sender, or null.
 */
export async function sendRequest(userId: string, email: string): Promise<string | null> {
  const db = getDb();
  const [to] = await db.select({ id: user.id }).from(user).where(eq(sql`lower(${user.email})`, email.toLowerCase()));
  if (!to) return "No Notified Law account uses that email.";
  if (to.id === userId) return "That is your own email.";
  // A block either way looks like no account, so the blocked person learns nothing.
  if (await blockedEitherWay(userId, to.id)) return "No Notified Law account uses that email.";
  const [row] = await db.select().from(friendship).where(between(userId, to.id));
  if (row?.status === "accepted") return "You are already friends.";
  if (row?.fromId === userId) return "You have already sent them a request.";
  if (row) {
    await respond(userId, to.id);
    return null;
  }
  if ((await count(userId)) >= MAX_FRIENDS) return `You can have up to ${MAX_FRIENDS} friends and requests.`;
  if ((await count(to.id)) >= MAX_FRIENDS) return "They cannot take any more friend requests.";
  await db.insert(friendship).values({ fromId: userId, toId: to.id, createdAt: new Date() }).onConflictDoNothing();
  return null;
}

/** Accepts the pending request `fromId` sent the user. False if there is none, or if either has blocked the other. */
export async function respond(userId: string, fromId: string) {
  if (await blockedEitherWay(userId, fromId)) return false;
  const rows = await getDb().update(friendship).set({ status: "accepted", acceptedAt: new Date() })
    .where(and(eq(friendship.fromId, fromId), eq(friendship.toId, userId), eq(friendship.status, "pending"))).returning();
  return rows.length > 0;
}

/** Declines a request, cancels one sent, or ends a friendship: whichever the user has with `otherId`. Ending a friendship deletes the conversation too. */
export async function unfriend(userId: string, otherId: string) {
  const db = getDb();
  await db.batch([db.delete(friendship).where(between(userId, otherId)), db.delete(message).where(pairOf(userId, otherId))]);
}

/**
 * Whether the two accounts are friends and neither has blocked the other, which messaging and calling need. The block
 * check stays here even though block() deletes the friendship: a request accepted while a block was being written
 * could otherwise leave a friendship row behind.
 */
export async function areFriends(a: string, b: string) {
  const [row] = await getDb().select({ status: friendship.status }).from(friendship).where(between(a, b));
  return row?.status === "accepted" && !(await blockedEitherWay(a, b));
}

/** Everyone the user has blocked or been blocked by, to keep them apart in groups they share with others. */
export async function blockedWith(userId: string) {
  const rows = await getDb().select({ a: userBlock.blockerId, b: userBlock.blockedId }).from(userBlock)
    .where(or(eq(userBlock.blockerId, userId), eq(userBlock.blockedId, userId)));
  return new Set(rows.map((r) => (r.a === userId ? r.b : r.a)));
}

/** Whether either account has blocked the other. */
export async function blockedEitherWay(a: string, b: string) {
  const [row] = await getDb().select({ x: userBlock.blockerId }).from(userBlock)
    .where(or(and(eq(userBlock.blockerId, a), eq(userBlock.blockedId, b)), and(eq(userBlock.blockerId, b), eq(userBlock.blockedId, a))));
  return !!row;
}

/** Names and pictures of a few accounts (a group's members, a call's people), keyed by id. */
export async function people(ids: string[]) {
  if (!ids.length) return new Map<string, { name: string; avatar: string | null }>();
  const rows = await getDb().select({ id: user.id, name: user.name, first: profile.firstName, last: profile.lastName, avatar: userAvatar.key })
    .from(user).leftJoin(profile, eq(profile.userId, user.id)).leftJoin(userAvatar, eq(userAvatar.userId, user.id))
    .where(inArray(user.id, [...new Set(ids)].slice(0, 90)));
  return new Map(rows.map((r) => [r.id, { name: r.first ? `${r.first} ${r.last}` : NO_NAME, avatar: avatarUrl(r.avatar) }]));
}
