import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, planOf } from "@/lib/auth";
import { subscription, userFile, userFolder } from "@/db/schema";
import { PLAN_STORAGE } from "@/lib/data";
import type { FileKind } from "@/lib/file-check";

/** A file as the client sees it. Times are epoch ms. */
export type StoredFile = { id: string; name: string; kind: FileKind; size: number; folderId: string | null; createdAt: number };
export type Folder = { id: string; name: string; parentId: string | null; createdAt: number };
export type FilesState = { files: StoredFile[]; folders: Folder[]; used: number; quota: number };

/** Folders may nest this deep, and each user may have this many. */
export const MAX_FOLDER_DEPTH = 8;
export const MAX_FOLDERS = 500;

/** The private bucket for uploads. Nothing in it is public: every read goes through /api/files/[id]. */
export const filesBucket = () => getCloudflareContext().env.FILES;

export const CONTENT_TYPES: Record<FileKind, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/** Object key for an upload: the owner's id, then the row id. Never built from the file name. */
export const fileKey = (userId: string, id: string) => `users/${userId}/${id}`;

/** Storage the user's plan includes now. */
export async function quotaFor(userId: string) {
  const [row] = await getDb().select({ plan: subscription.plan }).from(subscription).where(eq(subscription.userId, userId));
  return PLAN_STORAGE[planOf(row)];
}

export async function filesFor(userId: string): Promise<FilesState> {
  const db = getDb();
  const [rows, folders, quota] = await Promise.all([
    db.select({ id: userFile.id, name: userFile.name, kind: userFile.kind, size: userFile.size, folderId: userFile.folderId, createdAt: userFile.createdAt })
      .from(userFile).where(eq(userFile.userId, userId)).orderBy(desc(userFile.createdAt)),
    foldersOf(userId),
    quotaFor(userId),
  ]);
  const files = rows.map((r) => ({ ...r, kind: r.kind as FileKind, createdAt: r.createdAt.getTime() }));
  return { files, folders, used: files.reduce((t, f) => t + f.size, 0), quota };
}

/**
 * Adds the row only if it fits in the user's quota, in one statement: D1 runs statements one at a time, so two
 * uploads at once cannot both squeeze into the last of the space. False when the file does not fit.
 */
export async function reserve(row: typeof userFile.$inferInsert, quota: number) {
  const res = await getDb().run(sql`
    INSERT INTO ${userFile} (id, user_id, key, name, kind, folder_id, size, sha256, created_at)
    SELECT ${row.id}, ${row.userId}, ${row.key}, ${row.name}, ${row.kind}, ${row.folderId ?? null}, ${row.size}, ${row.sha256}, ${row.createdAt.getTime()}
    WHERE (SELECT COALESCE(SUM(size), 0) FROM ${userFile} WHERE user_id = ${row.userId}) + ${row.size} <= ${quota}`);
  return res.meta.changes > 0;
}

/** The user's own file row, or undefined: another user's id finds nothing. */
export async function ownFile(userId: string, id: string) {
  const [row] = await getDb().select().from(userFile).where(and(eq(userFile.id, id), eq(userFile.userId, userId)));
  return row;
}

export const dropRow = (id: string) => getDb().delete(userFile).where(eq(userFile.id, id));

export async function foldersOf(userId: string): Promise<Folder[]> {
  const rows = await getDb().select({ id: userFolder.id, name: userFolder.name, parentId: userFolder.parentId, createdAt: userFolder.createdAt })
    .from(userFolder).where(eq(userFolder.userId, userId)).orderBy(userFolder.name);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.getTime() }));
}

/** Depth of a folder (top level is 1), following parents through `all`. */
export function depthOf(all: Folder[], id: string | null) {
  const byId = new Map(all.map((f) => [f.id, f]));
  let d = 0;
  for (let at = id; at && d <= MAX_FOLDER_DEPTH + 1; at = byId.get(at)?.parentId ?? null) d++;
  return d;
}

/** The folder and every folder inside it, at any depth. */
export function subtree(all: Folder[], id: string) {
  const out = new Set([id]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const f of all) if (f.parentId && out.has(f.parentId) && !out.has(f.id)) { out.add(f.id); grew = true; }
  }
  return out;
}

/** Cleans a folder name for display; null if nothing usable is left. */
export function cleanFolderName(raw: unknown) {
  if (typeof raw !== "string") return null;
  const name = raw.normalize("NFC").replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, "").replace(/[/\\:*?"<>|]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80).trim();
  return name || null;
}

/** Deletes files' objects and rows, 100 at a time (D1 binds at most 100 values per query). */
export async function dropFiles(rows: { id: string; key: string }[]) {
  for (let i = 0; i < rows.length; i += 100) {
    const part = rows.slice(i, i + 100);
    await filesBucket().delete(part.map((r) => r.key));
    await getDb().delete(userFile).where(inArray(userFile.id, part.map((r) => r.id)));
  }
}

/** Removes every object a user has stored. Used when the account is deleted, after its rows are gone. */
export async function purgeUserObjects(userId: string) {
  const bucket = filesBucket();
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix: fileKey(userId, ""), cursor, limit: 1000 });
    if (page.objects.length) await bucket.delete(page.objects.map((o) => o.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}
