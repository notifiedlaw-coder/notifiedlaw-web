import { and, eq } from "drizzle-orm";
import { getDb, userIdFrom } from "@/lib/auth";
import { userFile } from "@/db/schema";
import { cleanFileName, type FileKind } from "@/lib/file-check";
import { readJson } from "@/lib/http";
import { limited } from "@/lib/rate-limit";
import { apiError } from "@/lib/error-codes";
import { CONTENT_TYPES, dropFiles, filesBucket, folderLive, foldersOf, ownFile } from "@/lib/files";

/** Header value for the download name: an ASCII fallback plus the exact name, RFC 6266 style. */
function disposition(type: "inline" | "attachment", name: string) {
  const ascii = name.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/** Streams one of the user's own files. ?view=1 opens a PDF in the browser; everything else downloads. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await userIdFrom(req);
  if (!userId) return new Response("Not found", { status: 404 });
  const rl = await limited(req, "READS", userId);
  if (rl) return rl;
  const row = await ownFile(userId, (await params).id);
  if (!row) return new Response("Not found", { status: 404 });
  const obj = await filesBucket().get(row.key);
  if (!obj || obj.customMetadata?.userId !== userId) return new Response("Not found", { status: 404 });

  const kind = row.kind as FileKind;
  const inline = kind === "pdf" && new URL(req.url).searchParams.get("view") === "1";
  const headers = new Headers({
    "content-type": CONTENT_TYPES[kind],
    "content-length": String(obj.size),
    "content-disposition": disposition(inline ? "inline" : "attachment", row.name),
    "cache-control": "private, no-store",
    // With the exact type and no sniffing, a file can only ever open as a PDF or download, never run as a page.
    "x-content-type-options": "nosniff",
  });
  return new Response(obj.body, { headers });
}

/** Deletes one of the user's own files and frees its space. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await userIdFrom(req);
  if (!userId) return apiError("A001", 401);
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  const row = await ownFile(userId, (await params).id);
  if (!row) return apiError("M201", 404);
  await dropFiles([row]);
  return Response.json({ ok: true });
}

/** Renames a file (its extension stays) and/or moves it to another of the user's folders (folderId null: top level). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await userIdFrom(req);
  if (!userId) return apiError("A001", 401);
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  const row = await ownFile(userId, (await params).id);
  if (!row) return apiError("M201", 404);
  const body = (await readJson(req)) as { name?: unknown; folderId?: unknown } | null;
  const set: { name?: string; folderId?: string | null } = {};
  if (body?.name !== undefined) {
    const kind = row.kind as FileKind;
    const raw = typeof body.name === "string" ? body.name.trim() : "";
    const name = raw && cleanFileName(raw.toLowerCase().endsWith(`.${kind}`) ? raw : `${raw}.${kind}`, kind);
    if (!name) return apiError("M202", 400);
    set.name = name;
  }
  if (body?.folderId !== undefined) {
    const folderId = typeof body.folderId === "string" ? body.folderId : null;
    if (folderId && !(await foldersOf(userId)).some((f) => f.id === folderId)) return apiError("M203", 404);
    set.folderId = folderId;
  }
  if (!Object.keys(set).length) return apiError("M204", 400);
  const done = await getDb().update(userFile).set(set)
    .where(and(eq(userFile.id, row.id), eq(userFile.userId, userId), set.folderId ? folderLive(userId, set.folderId) : undefined)).returning({ id: userFile.id });
  if (!done.length) return apiError("M203", 404);
  return Response.json({ ok: true, ...set });
}
