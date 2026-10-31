import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { REPORT_KINDS, REPORT_REASONS, report, type ReportKind } from "@/lib/moderation";

/** POST /api/reports { kind: user|group|message|group_message, target, reason }: reports abuse for review. */
export async function POST(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  const b = (await readJson(req)) as { kind?: unknown; target?: unknown; reason?: unknown } | null;
  const kind = REPORT_KINDS.find((k) => k === b?.kind) as ReportKind | undefined;
  const reason = REPORT_REASONS.find((r) => r === b?.reason);
  const target = typeof b?.target === "string" && b.target.length <= 64 ? b.target : "";
  if (!kind || !reason || !target) return Response.json({ error: "Choose what is wrong." }, { status: 400 });
  const error = await report(userId, kind, target, reason);
  if (error) return Response.json({ error }, { status: 400 });
  return Response.json({ ok: true });
}
