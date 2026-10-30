import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { apiError } from "@/lib/error-codes";
import { FAILURES, caseId } from "@/lib/compare-api";
import { quotaFor } from "@/lib/files";
import { compareCases } from "@/lib/compare";

const noStore = { "cache-control": "private, no-store" };

/**
 * POST /api/case-law/compare { a, b }: the AI comparison of two published case briefs (src/lib/compare.ts).
 * Needs a plan. Failures answer with a code only (src/lib/error-codes.ts).
 */
export async function POST(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return apiError("A001", 401);
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  if (!(await quotaFor(userId))) return apiError("U101", 402);
  const body = (await readJson(req)) as { a?: unknown; b?: unknown } | null;
  const a = caseId(body?.a), b = caseId(body?.b);
  if (!a || !b) return apiError("C101", 400);
  const r = await compareCases(userId, a, b);
  if (!r.ok) return apiError(...FAILURES[r.why]);
  return Response.json({ comparison: r.comparison, model: r.model, cached: r.cached }, { headers: noStore });
}
