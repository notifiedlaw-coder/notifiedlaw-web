import { and, eq, gt, inArray, like, ne, sql } from "drizzle-orm";
import { groupMember, typing } from "@/db/schema";
import { getDb } from "@/lib/auth";
import { people } from "@/lib/friends";
import { TYPING_MS } from "@/lib/friend-view";

export const dmChat = (toId: string) => `u:${toId}`;
export const groupChat = (groupId: string) => `g:${groupId}`;

/** Marks the user typing in a chat for the next few seconds, or stops it. The caller has checked they belong there. */
export async function setTyping(userId: string, chat: string, on: boolean) {
  const db = getDb();
  if (!on) return void (await db.delete(typing).where(and(eq(typing.userId, userId), eq(typing.chat, chat))));
  const untilAt = new Date(Date.now() + TYPING_MS);
  await db.insert(typing).values({ userId, chat, untilAt }).onConflictDoUpdate({ target: [typing.userId, typing.chat], set: { untilAt } });
}

/** Clears the user's typing in a chat, as part of sending a message there. */
export const stopTyping = (userId: string, chat: string) =>
  getDb().delete(typing).where(and(eq(typing.userId, userId), eq(typing.chat, chat)));

/** Whether a friend is typing to the user now. */
export async function friendTyping(userId: string, friendId: string) {
  const [r] = await getDb().select({ x: typing.userId }).from(typing)
    .where(and(eq(typing.userId, friendId), eq(typing.chat, dmChat(userId)), gt(typing.untilAt, new Date())));
  return !!r;
}

/** The people typing in a group now, other than the user. */
export async function groupTyping(userId: string, groupId: string) {
  const rows = await getDb().select({ id: typing.userId }).from(typing)
    .where(and(eq(typing.chat, groupChat(groupId)), gt(typing.untilAt, new Date()), ne(typing.userId, userId)));
  if (!rows.length) return [];
  const names = await people(rows.map((r) => r.id));
  return rows.map((r) => ({ id: r.id, name: names.get(r.id)?.name ?? "Someone", avatar: names.get(r.id)?.avatar ?? null }));
}

/** For the chat list: friends typing to the user, and the user's groups where someone else is typing. */
export async function typingFor(userId: string) {
  const db = getDb();
  const now = new Date();
  const mine = db.select({ chat: sql<string>`'g:' || ${groupMember.groupId}` }).from(groupMember).where(eq(groupMember.userId, userId));
  const [friends, groups] = await Promise.all([
    db.select({ id: typing.userId }).from(typing).where(and(eq(typing.chat, dmChat(userId)), gt(typing.untilAt, now))),
    db.selectDistinct({ chat: typing.chat }).from(typing)
      .where(and(like(typing.chat, "g:%"), inArray(typing.chat, mine), gt(typing.untilAt, now), ne(typing.userId, userId))),
  ]);
  return { friends: friends.map((r) => r.id), groups: groups.map((r) => r.chat.slice(2)) };
}
