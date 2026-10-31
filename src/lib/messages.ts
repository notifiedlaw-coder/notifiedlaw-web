import { and, desc, eq, gt, gte, isNotNull, isNull, or, sql } from "drizzle-orm";
import { message } from "@/db/schema";
import { getDb } from "@/lib/auth";
import { MESSAGE_TTL_MS, UNREAD_TTL_MS, type Message, type Thread } from "@/lib/friend-view";

/** The most messages a conversation loads at once, newest kept. */
const MAX_LOAD = 200;

/** Both directions of a conversation. */
export const pairOf = (a: string, b: string) =>
  or(and(eq(message.fromId, a), eq(message.toId, b)), and(eq(message.fromId, b), eq(message.toId, a)));
/** Not yet past its delete date. The cron deletes expired rows daily; until then reads skip them. */
const live = (now: number) => or(isNull(message.expiresAt), gt(message.expiresAt, new Date(now)));

const view = (userId: string) => (r: typeof message.$inferSelect): Message => ({
  id: r.id, fromMe: r.fromId === userId, body: r.body, at: r.createdAt.getTime(),
  readAt: r.readAt?.getTime() ?? null, expiresAt: r.expiresAt?.getTime() ?? null,
});

/**
 * A conversation as the user opens it: what the friend sent is marked read, which brings its delete date forward to 30
 * days from now (if sooner than 90 days from sending). `after` (ms) returns only messages from then on, for polling. `seen` is when the newest message the friend has read was sent.
 */
export async function conversation(userId: string, friendId: string, after?: number) {
  const now = Date.now();
  const db = getDb();
  // Never later than the 90 days from sending.
  await db.update(message).set({ readAt: new Date(now), expiresAt: sql`min(${message.expiresAt}, ${now + MESSAGE_TTL_MS})` })
    .where(and(eq(message.fromId, friendId), eq(message.toId, userId), isNull(message.readAt), live(now)));
  const [rows, [seen]] = await Promise.all([
    db.select().from(message)
      .where(and(pairOf(userId, friendId), live(now), after ? gte(message.createdAt, new Date(after)) : undefined))
      .orderBy(desc(message.createdAt)).limit(MAX_LOAD),
    db.select({ at: sql<number | null>`max(${message.createdAt})` }).from(message)
      .where(and(eq(message.fromId, userId), eq(message.toId, friendId), isNotNull(message.readAt), live(now))),
  ]);
  return { messages: rows.reverse().map(view(userId)), seen: seen?.at ?? null };
}

/** Sends a message; the caller has checked the two are friends. It is deleted 90 days on, sooner once read. */
export async function sendMessage(userId: string, friendId: string, body: string): Promise<Message> {
  const now = Date.now();
  const row = { id: crypto.randomUUID(), fromId: userId, toId: friendId, body, createdAt: new Date(now), readAt: null, expiresAt: new Date(now + UNREAD_TTL_MS) };
  await getDb().insert(message).values(row);
  return view(userId)(row);
}

/** The newest message and unread count of each conversation, for the friends list. */
export async function threads(userId: string): Promise<Thread[]> {
  const now = Date.now();
  const db = getDb();
  const [recent, unread] = await Promise.all([
    db.select().from(message).where(and(or(eq(message.fromId, userId), eq(message.toId, userId)), live(now)))
      .orderBy(desc(message.createdAt)).limit(1000),
    db.select({ from: message.fromId, n: sql<number>`count(*)` }).from(message)
      .where(and(eq(message.toId, userId), isNull(message.readAt), live(now))).groupBy(message.fromId),
  ]);
  const byFriend = new Map<string, Thread>();
  for (const r of recent) {
    const friendId = r.fromId === userId ? r.toId : r.fromId;
    if (!byFriend.has(friendId)) byFriend.set(friendId, { friendId, last: { body: r.body, fromMe: r.fromId === userId, at: r.createdAt.getTime() }, unread: 0 });
  }
  for (const u of unread) {
    const t = byFriend.get(u.from);
    if (t) t.unread = u.n;
  }
  return [...byFriend.values()];
}

/** Messages waiting to be read, for the badge on the friends button. */
export async function unreadCount(userId: string) {
  const [r] = await getDb().select({ n: sql<number>`count(*)` }).from(message).where(and(eq(message.toId, userId), isNull(message.readAt), live(Date.now())));
  return r?.n ?? 0;
}
