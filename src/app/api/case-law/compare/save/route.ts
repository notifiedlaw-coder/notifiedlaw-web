import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { apiError } from "@/lib/error-codes";
import { checkFile, cleanFileName } from "@/lib/file-check";
import { countUpload, quotaFor, saveFile } from "@/lib/files";
import { compareCases } from "@/lib/compare";
import { comparisonDocx, comparisonFileName } from "@/lib/compare-doc";
import { FAILURES, caseId } from "@/lib/compare-api";

/**
 * POST /api/case-law/compare/save { a, b, folderId? }: saves the comparison of two case briefs as a Word document
 * in the user's My Files. The comparison is rebuilt from the cache on the server, never taken from the browser.
 * The file is made here, so it skips the virus scan an upload gets; it still passes the content check.
 */
export async function POST(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return apiError("A001", 401);
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  const quota = await quotaFor(userId);
  if (!quota) return apiError("U101", 402);
  const body = (await readJson(req)) as { a?: unknown; b?: unknown; folderId?: unknown } | null;
  const a = caseId(body?.a), b = caseId(body?.b);
  if (!a || !b) return apiError("C101", 400);
  const r = await compareCases(userId, a, b);
  if (!r.ok) return apiError(...FAILURES[r.why]);

  const bytes = comparisonDocx(r.comparison, r.model);
  const check = await checkFile(bytes);
  if (!check.ok || check.kind !== "docx") {
    console.error("generated comparison failed the content check", check.ok ? "wrong kind" : check.error);
    return apiError("C106", 500);
  }
  const name = cleanFileName(comparisonFileName(r.comparison), "docx");
  if (!name) return apiError("U110", 422);
  if (!(await countUpload(userId, bytes.length))) return apiError("U107", 429);
  const saved = await saveFile(userId, quota, { name, kind: "docx", folderId: typeof body?.folderId === "string" ? body.folderId : null, bytes });
  if (!saved.ok) return apiError(saved.code, saved.status);
  return Response.json(saved.file, { status: 201, headers: { "cache-control": "private, no-store" } });
}
