import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { aiChat, aiMessage, subscription } from "@/db/schema";
import { getDb, planCols, planOf } from "@/lib/auth";
import { PLAN_CREDITS } from "@/lib/data";
import { parseRefs, type Ref } from "@/lib/ai/refs";

export type ChatSummary = { id: string; title: string; pinned: boolean; updatedAt: number };
/** `files`: on a question the things @-mentioned, on an answer the sources it was given. */
export type StoredMessage = { id: string; role: "user" | "assistant"; content: string; files: Ref[]; createdAt: number };

/** Most conversations a user keeps; the oldest go when a new one would pass it. */
export const MAX_CHATS = 200;

export async function chatsOf(userId: string): Promise<ChatSummary[]> {
  const rows = await getDb().select({ id: aiChat.id, title: aiChat.title, pinned: aiChat.pinned, updatedAt: aiChat.updatedAt })
    .from(aiChat).where(eq(aiChat.userId, userId)).orderBy(desc(aiChat.updatedAt)).limit(MAX_CHATS);
  return rows.map((r) => ({ ...r, updatedAt: r.updatedAt.getTime() }));
}

/** The user's own chat, or undefined: another user's id finds nothing. */
export async function ownChat(userId: string, id: string) {
  const [row] = await getDb().select().from(aiChat).where(and(eq(aiChat.id, id), eq(aiChat.userId, userId)));
  return row;
}

export async function messagesOf(chatId: string): Promise<StoredMessage[]> {
  const rows = await getDb().select().from(aiMessage).where(eq(aiMessage.chatId, chatId)).orderBy(asc(aiMessage.createdAt), desc(aiMessage.role));
  return rows.map((r) => ({ id: r.id, role: r.role as "user" | "assistant", content: r.content, files: parseRefs(r.files), createdAt: r.createdAt.getTime() }));
}

/** A new conversation titled with the first question, shortened. Drops the oldest beyond MAX_CHATS. */
export async function createChat(userId: string, firstQuestion: string) {
  const db = getDb();
  const now = new Date();
  const id = crypto.randomUUID();
  const title = firstQuestion.replace(/\s+/g, " ").trim().slice(0, 60) || "New chat";
  await db.insert(aiChat).values({ id, userId, title, createdAt: now, updatedAt: now });
  await db.run(sql`DELETE FROM ${aiChat} WHERE user_id = ${userId} AND id NOT IN (SELECT id FROM ${aiChat} WHERE user_id = ${userId} ORDER BY updated_at DESC LIMIT ${MAX_CHATS})`);
  return id;
}

export async function addMessage(chatId: string, role: "user" | "assistant", content: string, attached: Ref[] = []) {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(aiMessage).values({ id, chatId, role, content, files: JSON.stringify(attached), createdAt: now });
  await db.update(aiChat).set({ updatedAt: now }).where(eq(aiChat.id, chatId));
  return id;
}

/** Renames and/or pins a conversation. Pinning does not move it in time: pinned chats are listed first. */
export const updateChat = (userId: string, id: string, set: { title?: string; pinned?: boolean }) =>
  getDb().update(aiChat).set(set).where(and(eq(aiChat.id, id), eq(aiChat.userId, userId)));

/** Deletes a message and every one after it (used to replace a question or an answer). */
export async function deleteFrom(chatId: string, messageId: string) {
  const all = await messagesOf(chatId);
  const at = all.findIndex((m) => m.id === messageId);
  if (at < 0) return;
  const ids = all.slice(at).map((m) => m.id);
  for (let i = 0; i < ids.length; i += 100) await getDb().delete(aiMessage).where(inArray(aiMessage.id, ids.slice(i, i + 100)));
}
export const deleteChat = (userId: string, id: string) =>
  getDb().delete(aiChat).where(and(eq(aiChat.id, id), eq(aiChat.userId, userId)));

// ---- Notify Credits ----------------------------------------------------------------------------------------------

/** Credits left this month on the user's plan. */
export async function creditsLeft(userId: string) {
  const [row] = await getDb().select({ ...planCols, used: subscription.creditsUsed }).from(subscription).where(eq(subscription.userId, userId));
  return { allowance: PLAN_CREDITS[planOf(row)], left: Math.max(0, PLAN_CREDITS[planOf(row)] - (row?.used ?? 0)) };
}

/** Takes one message's credits, in one statement so two messages at once cannot both spend the last of them. False when short. */
export async function spendCredits(userId: string, cost: number) {
  const { allowance } = await creditsLeft(userId);
  const res = await getDb().run(sql`UPDATE ${subscription} SET credits_used = credits_used + ${cost} WHERE user_id = ${userId} AND credits_used + ${cost} <= ${allowance}`);
  return res.meta.changes > 0;
}

/** Gives credits back when a message could not be answered. */
export const refundCredits = (userId: string, cost: number) =>
  getDb().run(sql`UPDATE ${subscription} SET credits_used = MAX(0, credits_used - ${cost}) WHERE user_id = ${userId}`);
