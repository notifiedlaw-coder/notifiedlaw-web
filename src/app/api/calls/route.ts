import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { CallError, startCall } from "@/lib/calls";

/**
 * POST /api/calls { friendId } or { groupId }: starts a voice call (or returns the one already going with that
 * friend or group, to join). Calls end on their own after 3 hours.
 */
export async function POST(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "CALLS", userId);
  if (rl) return rl;
  const b = (await readJson(req)) as { friendId?: unknown; groupId?: unknown } | null;
  const str = (v: unknown) => (typeof v === "string" && v.length <= 64 ? v : undefined);
  try {
    return Response.json({ call: await startCall(userId, { friendId: str(b?.friendId), groupId: str(b?.groupId) }) });
  } catch (e) {
    if (e instanceof CallError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
