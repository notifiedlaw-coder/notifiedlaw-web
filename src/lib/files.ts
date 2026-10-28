import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, planOf } from "@/lib/auth";
import { subscription, userFile } from "@/db/schema";
import { PLAN_STORAGE } from "@/lib/data";
import type { FileKind } from "@/lib/file-check";

/** A file as the client sees it. Times are epoch ms. */
export type StoredFile = { id: string; name: string; kind: FileKind; size: number; createdAt: number };
export type FilesState = { files: StoredFile[]; used: number; quota: number };

/** The private bucket for uploads. Nothing in it is public: every read goes through /api/files/[id]. */
export const filesBucket = () => getCloudflareContext().env.FILES;

export const CONTENT_TYPES: Record<FileKind, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/** Object key for an upload: the owner's id, then the row id. Never built from the file name. */
export const fileKey = (userId: string, id: string) => `users/${userId}/${id}`;

/** Storage the user's plan includes now (a running university trial counts as Pro). */
export async function quotaFor(userId: string) {
  const [row] = await getDb().select({ plan: subscription.plan, trialEndsAt: subscription.trialEndsAt }).from(subscription).where(eq(subscription.userId, userId));
  return PLAN_STORAGE[planOf(row)];
}

export async function filesFor(userId: string): Promise<FilesState> {
  const db = getDb();
  const [rows, quota] = await Promise.all([
    db.select({ id: userFile.id, name: userFile.name, kind: userFile.kind, size: userFile.size, createdAt: userFile.createdAt })
      .from(userFile).where(eq(userFile.userId, userId)).orderBy(desc(userFile.createdAt)),
    quotaFor(userId),
  ]);
  const files = rows.map((r) => ({ ...r, kind: r.kind as FileKind, createdAt: r.createdAt.getTime() }));
  return { files, used: files.reduce((t, f) => t + f.size, 0), quota };
}

/**
 * Adds the row only if it fits in the user's quota, in one statement: D1 runs statements one at a time, so two
 * uploads at once cannot both squeeze into the last of the space. False when the file does not fit.
 */
export async function reserve(row: typeof userFile.$inferInsert, quota: number) {
  const res = await getDb().run(sql`
    INSERT INTO ${userFile} (id, user_id, key, name, kind, size, sha256, created_at)
    SELECT ${row.id}, ${row.userId}, ${row.key}, ${row.name}, ${row.kind}, ${row.size}, ${row.sha256}, ${row.createdAt.getTime()}
    WHERE (SELECT COALESCE(SUM(size), 0) FROM ${userFile} WHERE user_id = ${row.userId}) + ${row.size} <= ${quota}`);
  return res.meta.changes > 0;
}

/** The user's own file row, or undefined: another user's id finds nothing. */
export async function ownFile(userId: string, id: string) {
  const [row] = await getDb().select().from(userFile).where(and(eq(userFile.id, id), eq(userFile.userId, userId)));
  return row;
}

export const dropRow = (id: string) => getDb().delete(userFile).where(eq(userFile.id, id));
