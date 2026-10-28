import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { readBytes } from "@/lib/http";
import { MAX_FILE_BYTES } from "@/lib/data";
import { checkFile, cleanFileName } from "@/lib/file-check";
import { CONTENT_TYPES, dropRow, fileKey, filesBucket, filesFor, quotaFor, reserve } from "@/lib/files";

const noStore = { "cache-control": "private, no-store" };

/** The signed-in user's files, with storage used and allowed. */
export async function GET(req: Request) {
  const id = await userIdFrom(req);
  if (!id) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "READS", id);
  if (rl) return rl;
  return Response.json(await filesFor(id), { headers: noStore });
}

/**
 * Uploads one file. The body is the raw file and the x-file-name header its name, URI-encoded. The bytes are
 * checked (src/lib/file-check.ts), space is reserved against the plan's quota, then the file goes to R2.
 */
export async function POST(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;

  let rawName = "";
  try { rawName = decodeURIComponent(req.headers.get("x-file-name") ?? ""); } catch { /* falls through to the name check */ }
  if (!/\.(pdf|docx)$/i.test(rawName.trim())) return Response.json({ error: "Only PDF and Word (.docx) files can be uploaded." }, { status: 415 });

  const bytes = await readBytes(req, MAX_FILE_BYTES);
  if (!bytes) return Response.json({ error: `Files can be up to ${MAX_FILE_BYTES / 1024 / 1024} MB.` }, { status: 413 });
  const check = await checkFile(bytes);
  if (!check.ok) return Response.json({ error: check.error }, { status: 422 });
  const name = cleanFileName(rawName, check.kind);
  if (!name) return Response.json({ error: `This file's name says one type but it is really a ${check.kind.toUpperCase()}. Rename it and try again.` }, { status: 422 });

  const id = crypto.randomUUID();
  const sha256 = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const row = { id, userId, key: fileKey(userId, id), name, kind: check.kind, size: bytes.length, sha256, createdAt: new Date() };
  if (!(await reserve(row, await quotaFor(userId)))) return Response.json({ error: "Your storage is full. Delete some files or upgrade your plan for more space." }, { status: 413 });
  try {
    await filesBucket().put(row.key, bytes, { httpMetadata: { contentType: CONTENT_TYPES[check.kind] }, customMetadata: { userId }, sha256 });
  } catch {
    await dropRow(id);
    return Response.json({ error: "The upload failed. Try again." }, { status: 502 });
  }
  return Response.json({ id, name, kind: check.kind, size: row.size, createdAt: row.createdAt.getTime() }, { status: 201, headers: noStore });
}
