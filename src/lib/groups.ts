import { and, asc, desc, eq, gt, gte, inArray, isNull, ne, notInArray, sql } from "drizzle-orm";
import { call, chatGroup, friendship, groupMember, groupMessage, typing, userBlock } from "@/db/schema";
import { getDb } from "@/lib/auth";
import { blockedWith, people } from "@/lib/friends";
import { endGroupCalls, leaveGroupCalls } from "@/lib/calls";
import { MAX_GROUP_MEMBERS, MAX_GROUP_NAME, MAX_OWNED_GROUPS, UNREAD_TTL_MS, avatarUrl, type GroupDetail, type GroupMessage, type GroupSummary } from "@/lib/friend-view";
import { PROFANITY_ERROR, hasProfanity } from "@/lib/profanity";

const MAX_LOAD = 200;

/** A cleaned group name, or an error message. */
export function cleanGroupName(v: unknown): string | { error: string } {
  const name = typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
  if (!name) return { error: "Give the group a name." };
  if (name.length > MAX_GROUP_NAME) return { error: `Group names can be up to ${MAX_GROUP_NAME} characters.` };
  if (hasProfanity(name)) return { error: PROFANITY_ERROR };
  return name;
}

/** The user's membership of a group, with the group; null if they are not in it. */
export async function membership(userId: string, groupId: string) {
  const [row] = await getDb().select({ group: chatGroup, member: groupMember }).from(groupMember)
    .innerJoin(chatGroup, eq(chatGroup.id, groupMember.groupId))
    .where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, userId)));
  return row ?? null;
}

/**
 * Of `ids`, the ones the admin may add: accepted friends of the admin, with no block either way. Others are dropped
 * silently, so the list cannot be used to probe who exists.
 */
async function addable(adminId: string, ids: string[]) {
  if (!ids.length) return [];
  const db = getDb();
  const [friends, blocks] = await Promise.all([
    db.select({ a: friendship.fromId, b: friendship.toId }).from(friendship)
      .where(and(eq(friendship.status, "accepted"), sql`(${friendship.fromId} = ${adminId} or ${friendship.toId} = ${adminId})`)),
    db.select({ a: userBlock.blockerId, b: userBlock.blockedId }).from(userBlock)
      .where(sql`${userBlock.blockerId} = ${adminId} or ${userBlock.blockedId} = ${adminId}`),
  ]);
  const ok = new Set(friends.map((f) => (f.a === adminId ? f.b : f.a)));
  for (const b of blocks) ok.delete(b.a === adminId ? b.b : b.a);
  return [...new Set(ids)].filter((id) => ok.has(id));
}

/** Creates a group with the user as its only admin. Returns the new id, or an error message. */
export async function createGroup(userId: string, nameIn: unknown, memberIds: string[]): Promise<{ id: string } | { error: string }> {
  const name = cleanGroupName(nameIn);
  if (typeof name !== "string") return name;
  const db = getDb();
  const [owned] = await db.select({ n: sql<number>`count(*)` }).from(chatGroup).where(eq(chatGroup.ownerId, userId));
  if ((owned?.n ?? 0) >= MAX_OWNED_GROUPS) return { error: `You can run up to ${MAX_OWNED_GROUPS} groups. Delete one to start another.` };
  const members = (await addable(userId, memberIds)).slice(0, MAX_GROUP_MEMBERS - 1);
  const id = crypto.randomUUID();
  const now = new Date();
  await db.batch([
    db.insert(chatGroup).values({ id, name, ownerId: userId, createdAt: now }),
    db.insert(groupMember).values([userId, ...members].map((m) => ({ groupId: id, userId: m, joinedAt: now, lastReadAt: now }))),
  ]);
  return { id };
}

/** The user's groups, newest activity first, with their last message, unread count and any call in progress. */
export async function myGroups(userId: string): Promise<GroupSummary[]> {
  const db = getDb();
  const now = Date.now();
  const rows = await db.select({ g: chatGroup, lastReadAt: groupMember.lastReadAt }).from(groupMember)
    .innerJoin(chatGroup, eq(chatGroup.id, groupMember.groupId)).where(eq(groupMember.userId, userId));
  if (!rows.length) return [];
  const ids = rows.map((r) => r.g.id);
  const [counts, lasts, unread, calls] = await Promise.all([
    db.select({ id: groupMember.groupId, n: sql<number>`count(*)` }).from(groupMember).where(inArray(groupMember.groupId, ids)).groupBy(groupMember.groupId),
    // The newest live message of each group.
    db.select().from(groupMessage).where(and(inArray(groupMessage.groupId, ids), gt(groupMessage.expiresAt, new Date(now)),
      sql`${groupMessage.createdAt} = (select max(m2.created_at) from group_message m2 where m2.group_id = ${groupMessage.groupId})`)),
    db.select({ id: groupMessage.groupId, n: sql<number>`count(*)` }).from(groupMessage)
      .innerJoin(groupMember, and(eq(groupMember.groupId, groupMessage.groupId), eq(groupMember.userId, userId)))
      .where(and(inArray(groupMessage.groupId, ids), ne(groupMessage.fromId, userId), gt(groupMessage.createdAt, groupMember.lastReadAt), gt(groupMessage.expiresAt, new Date(now))))
      .groupBy(groupMessage.groupId),
    db.select({ id: call.id, groupId: call.groupId }).from(call).where(and(inArray(call.groupId, ids), isNull(call.endedAt), gt(call.endsAt, new Date(now)))),
  ]);
  const names = await people(lasts.map((m) => m.fromId));
  const count = new Map(counts.map((c) => [c.id, c.n]));
  const last = new Map(lasts.map((m) => [m.groupId, m]));
  const un = new Map(unread.map((u) => [u.id, u.n]));
  const live = new Map(calls.map((c) => [c.groupId!, c.id]));
  return rows.map(({ g }) => {
    const m = last.get(g.id);
    return {
      id: g.id, name: g.name, avatar: avatarUrl(g.avatarKey), admin: g.ownerId === userId, members: count.get(g.id) ?? 1,
      last: m ? { body: m.body, from: names.get(m.fromId)?.name.split(" ")[0] ?? "Someone", fromMe: m.fromId === userId, at: m.createdAt.getTime() } : null,
      unread: un.get(g.id) ?? 0, call: live.get(g.id) ?? null,
    };
  }).sort((a, b) => (b.last?.at ?? 0) - (a.last?.at ?? 0));
}

/** A group's details and members, for a member. */
export async function groupDetail(groupId: string): Promise<GroupDetail | null> {
  const db = getDb();
  const [g] = await db.select().from(chatGroup).where(eq(chatGroup.id, groupId));
  if (!g) return null;
  const rows = await db.select({ id: groupMember.userId }).from(groupMember).where(eq(groupMember.groupId, groupId)).orderBy(asc(groupMember.joinedAt));
  const names = await people(rows.map((r) => r.id));
  return {
    id: g.id, name: g.name, avatar: avatarUrl(g.avatarKey), ownerId: g.ownerId,
    members: rows.map((r) => ({ id: r.id, name: names.get(r.id)?.name ?? "Notified Law user", avatar: names.get(r.id)?.avatar ?? null, admin: r.id === g.ownerId }))
      .sort((a, b) => Number(b.admin) - Number(a.admin) || a.name.localeCompare(b.name)),
  };
}

/** Adds the admin's friends to a group, up to the member limit. Returns an error message, or null. */
export async function addMembers(adminId: string, groupId: string, ids: string[]): Promise<string | null> {
  const db = getDb();
  const [n] = await db.select({ n: sql<number>`count(*)` }).from(groupMember).where(eq(groupMember.groupId, groupId));
  const room = MAX_GROUP_MEMBERS - (n?.n ?? 0);
  const add = (await addable(adminId, ids)).slice(0, Math.max(0, room));
  if (!add.length) return room <= 0 ? `Groups can have up to ${MAX_GROUP_MEMBERS} people.` : "Choose friends to add.";
  const now = new Date();
  await db.insert(groupMember).values(add.map((m) => ({ groupId, userId: m, joinedAt: now, lastReadAt: now }))).onConflictDoNothing();
  return null;
}

/** Takes someone out of a group, and out of any call going on in it. */
export async function removeMember(groupId: string, userId: string) {
  await getDb().delete(groupMember).where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, userId)));
  await leaveGroupCalls(userId, [groupId]);
}

export async function renameGroup(groupId: string, name: string) {
  await getDb().update(chatGroup).set({ name }).where(eq(chatGroup.id, groupId));
}

export async function setGroupAvatar(groupId: string, key: string | null) {
  await getDb().update(chatGroup).set({ avatarKey: key }).where(eq(chatGroup.id, groupId));
}

/** Deletes a group with its members, messages and calls. Open calls are ended first, while their rows still exist. */
export async function deleteGroup(groupId: string) {
  await endGroupCalls(groupId);
  await getDb().delete(chatGroup).where(eq(chatGroup.id, groupId));
}

/**
 * A group's live messages since the user joined, or those from `after` on, and (unless `markRead` is false) marks the
 * group read. Messages from anyone the user has blocked, or been blocked by, are left out.
 */
export async function groupMessages(userId: string, groupId: string, after?: number, markRead = true): Promise<GroupMessage[]> {
  const db = getDb();
  const now = Date.now();
  const [[member], blocked] = await Promise.all([
    db.select({ joinedAt: groupMember.joinedAt }).from(groupMember).where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, userId))),
    blockedWith(userId),
  ]);
  if (!member) return [];
  const since = Math.max(member.joinedAt.getTime(), after ?? 0);
  const [rows] = await Promise.all([
    db.select().from(groupMessage)
      .where(and(eq(groupMessage.groupId, groupId), gt(groupMessage.expiresAt, new Date(now)), gte(groupMessage.createdAt, new Date(since)),
        blocked.size ? notInArray(groupMessage.fromId, [...blocked]) : undefined))
      .orderBy(desc(groupMessage.createdAt)).limit(MAX_LOAD),
    markRead && db.update(groupMember).set({ lastReadAt: new Date(now) }).where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, userId))),
  ]);
  const names = await people(rows.map((r) => r.fromId));
  return rows.reverse().map((r) => ({
    id: r.id, fromId: r.fromId, fromMe: r.fromId === userId, name: names.get(r.fromId)?.name ?? "Former member",
    avatar: names.get(r.fromId)?.avatar ?? null, body: r.body, at: r.createdAt.getTime(),
  }));
}

/** Posts a message to a group; it is deleted 90 days on. */
export async function postGroupMessage(userId: string, groupId: string, body: string) {
  const now = Date.now();
  const row = { id: crypto.randomUUID(), groupId, fromId: userId, body, createdAt: new Date(now), expiresAt: new Date(now + UNREAD_TTL_MS) };
  await getDb().batch([
    getDb().insert(groupMessage).values(row),
    getDb().update(groupMember).set({ lastReadAt: new Date(now) }).where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, userId))),
    getDb().delete(typing).where(and(eq(typing.userId, userId), eq(typing.chat, `g:${groupId}`))), // ends the typing bubble
  ]);
  return row;
}

/** Unread group messages across the user's groups, for the friends button's badge. Blocked senders do not count. */
export async function groupUnreadCount(userId: string) {
  const blocked = await blockedWith(userId);
  const [r] = await getDb().select({ n: sql<number>`count(*)` }).from(groupMessage)
    .innerJoin(groupMember, and(eq(groupMember.groupId, groupMessage.groupId), eq(groupMember.userId, userId)))
    .where(and(ne(groupMessage.fromId, userId), blocked.size ? notInArray(groupMessage.fromId, [...blocked]) : undefined, gt(groupMessage.createdAt, groupMember.lastReadAt), gt(groupMessage.expiresAt, new Date())));
  return r?.n ?? 0;
}
