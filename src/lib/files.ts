import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, planCols, planOf } from "@/lib/auth";
import { subscription, uploadDay, userFile, userFolder } from "@/db/schema";
import { DAILY_UPLOADS, DAILY_UPLOAD_BYTES, PLAN_STORAGE } from "@/lib/data";
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
  const [row] = await getDb().select(planCols).from(subscription).where(eq(subscription.userId, userId));
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

/**
 * Counts one upload of `size` bytes against today's allowance, in one statement so parallel uploads cannot both slip
 * under it. False when the user is out of uploads or bytes for today. Counted before the virus scan, since a
 * refused file still used the scanner.
 */
export async function countUpload(userId: string, size: number) {
  const day = new Date().toISOString().slice(0, 10);
  const res = await getDb().run(sql`
    INSERT INTO ${uploadDay} (user_id, day, files, bytes) VALUES (${userId}, ${day}, 1, ${size})
    ON CONFLICT (user_id) DO UPDATE SET
      files = CASE WHEN day = excluded.day THEN files + 1 ELSE 1 END,
      bytes = CASE WHEN day = excluded.day THEN bytes + excluded.bytes ELSE excluded.bytes END,
      day = excluded.day
    WHERE day <> excluded.day OR (files < ${DAILY_UPLOADS} AND bytes + excluded.bytes <= ${DAILY_UPLOAD_BYTES})`);
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

/** Whether another folder in the same place already has this name. Names are unique per parent, ignoring case. */
export const nameTaken = (all: Folder[], parentId: string | null, name: string, except?: string) =>
  all.some((f) => f.id !== except && f.parentId === parentId && f.name.toLowerCase() === name.toLowerCase());

// The same rule inside the write, so two requests at once (a double submit) cannot both add the name.
const sameName = (userId: string, parentId: string | null, name: string, except: string) =>
  sql`NOT EXISTS (SELECT 1 FROM ${userFolder} WHERE user_id = ${userId} AND parent_id IS ${parentId} AND lower(name) = lower(${name}) AND id <> ${except})`;

/** Adds a folder unless its name is taken in that place, in one statement. False when it is. */
export async function addFolder(f: { id: string; userId: string; parentId: string | null; name: string; createdAt: Date }) {
  const res = await getDb().run(sql`
    INSERT INTO ${userFolder} (id, user_id, parent_id, name, created_at)
    SELECT ${f.id}, ${f.userId}, ${f.parentId}, ${f.name}, ${f.createdAt.getTime()}
    WHERE ${sameName(f.userId, f.parentId, f.name, f.id)}`);
  return res.meta.changes > 0;
}

/** Renames and/or moves a folder unless its name would then be taken there, in one statement. False when it would. */
export async function moveFolder(userId: string, id: string, parentId: string | null, name: string) {
  const res = await getDb().run(sql`
    UPDATE ${userFolder} SET parent_id = ${parentId}, name = ${name}
    WHERE id = ${id} AND user_id = ${userId} AND ${sameName(userId, parentId, name, id)}`);
  return res.meta.changes > 0;
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

/**
 * Stores checked bytes as a file in the user's space: folder check, quota reservation, then R2. Callers do the
 * content check, the daily count and (for uploads) the virus scan first. Failures are error codes
 * (src/lib/error-codes.ts): U111 folder not found, U112 quota full, U113 R2 failed.
 */
export async function saveFile(userId: string, quota: number, f: { name: string; kind: FileKind; folderId: string | null; bytes: Uint8Array<ArrayBuffer> }):
  Promise<{ ok: true; file: StoredFile } | { ok: false; code: "U111" | "U112" | "U113"; status: number }> {
  if (f.folderId && !(await foldersOf(userId)).some((x) => x.id === f.folderId)) return { ok: false, code: "U111", status: 404 };
  const id = crypto.randomUUID();
  const sha256 = [...new Uint8Array(await crypto.subtle.digest("SHA-256", f.bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const row = { id, userId, key: fileKey(userId, id), name: f.name, kind: f.kind, folderId: f.folderId, size: f.bytes.length, sha256, createdAt: new Date() };
  if (!(await reserve(row, quota))) return { ok: false, code: "U112", status: 413 };
  try {
    await filesBucket().put(row.key, f.bytes, { httpMetadata: { contentType: CONTENT_TYPES[f.kind] }, customMetadata: { userId }, sha256 });
  } catch {
    await dropRow(id);
    return { ok: false, code: "U113", status: 502 };
  }
  return { ok: true, file: { id, name: f.name, kind: f.kind, size: row.size, folderId: f.folderId, createdAt: row.createdAt.getTime() } };
}
