import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { CallError, callState } from "@/lib/calls";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/calls/<id>: the call and who else is in it, polled by the call screen (which also keeps the user present). */
export async function GET(req: Request, { params }: Ctx) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "CALLS", userId);
  if (rl) return rl;
  try {
    return Response.json(await callState(userId, (await params).id));
  } catch (e) {
    if (e instanceof CallError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
