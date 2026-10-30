import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { readBytes } from "@/lib/http";
import { MAX_FILE_BYTES } from "@/lib/data";
import { checkFile, cleanFileName } from "@/lib/file-check";
import { scanFile } from "@/lib/scan";
import { apiError } from "@/lib/error-codes";
import { countUpload, filesFor, quotaFor, saveFile } from "@/lib/files";

const noStore = { "cache-control": "private, no-store" };

/** The signed-in user's files, with storage used and allowed. */
export async function GET(req: Request) {
  const id = await userIdFrom(req);
  if (!id) return apiError("A001", 401);
  const rl = await limited(req, "READS", id);
  if (rl) return rl;
  return Response.json(await filesFor(id), { headers: noStore });
}

/**
 * Uploads one file. The body is the raw file, the x-file-name header its name (URI-encoded) and x-folder-id the
 * folder it goes in (none: top level). The bytes are checked (src/lib/file-check.ts), counted against the daily
 * upload allowance and virus scanned (src/lib/scan.ts), space is reserved against the plan's quota, then the file goes to R2.
 * Failures answer with a code only (src/lib/error-codes.ts); the content check's reason goes to the Worker log.
 */
export async function POST(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return apiError("A001", 401);
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  const quota = await quotaFor(userId);
  if (!quota) return apiError("U101", 402);

  let rawName = "";
  try { rawName = decodeURIComponent(req.headers.get("x-file-name") ?? ""); } catch { /* falls through to the name check */ }
  if (!/\.(pdf|docx)$/i.test(rawName.trim())) return apiError("U102", 415);

  const bytes = await readBytes(req, MAX_FILE_BYTES);
  if (!bytes) return apiError("U103", 413);
  const check = await checkFile(bytes);
  if (!check.ok) {
    const head = String.fromCharCode(...bytes.subarray(0, 5));
    console.warn("upload refused by the content check", check.error);
    return apiError(head === "%PDF-" ? "U105" : head.startsWith("PK\x03\x04") ? "U106" : "U104", 422);
  }
  if (!(await countUpload(userId, bytes.length))) return apiError("U107", 429);
  const scan = await scanFile(bytes);
  if (!scan.ok) return scan.infected ? apiError("U109", 422) : apiError("U108", 503);
  const name = cleanFileName(rawName, check.kind);
  if (!name) return apiError("U110", 422);

  const saved = await saveFile(userId, quota, { name, kind: check.kind, folderId: req.headers.get("x-folder-id") || null, bytes });
  if (!saved.ok) return apiError(saved.code, saved.status);
  return Response.json(saved.file, { status: 201, headers: noStore });
}
