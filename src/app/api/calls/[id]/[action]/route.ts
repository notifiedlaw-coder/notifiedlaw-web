import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { readBytes } from "@/lib/http";
import { CallError, answer, declineCall, joinCall, leaveCall, publish, subscribe } from "@/lib/calls";
import { ICE_SERVERS } from "@/lib/sfu";

type Ctx = { params: Promise<{ id: string; action: string }> };
/** SDP for two tracks, or answers covering up to 60 pulled tracks, stays well under this. */
const MAX_BODY = 256 * 1024;

const str = (v: unknown, max: number) => (typeof v === "string" && v.length <= max ? v : "");

/**
 * POST /api/calls/<id>/<action>, the call screen's signalling:
 * - join: a fresh SFU session; returns ICE servers and when the call must end.
 * - publish { sdp, tracks: [{ mid, name: audio }] }: returns the SFU's answer.
 * - subscribe { tracks: [{ userId, name }] }: returns an offer to answer (or none) and the mid of each track.
 * - answer { sdp }: the answer to a subscribe offer.
 * - leave, decline.
 */
export async function POST(req: Request, { params }: Ctx) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "CALLS", userId);
  if (rl) return rl;
  const { id, action } = await params;
  const raw = await readBytes(req, MAX_BODY);
  let b: Record<string, unknown> = {};
  try { if (raw?.length) b = JSON.parse(new TextDecoder().decode(raw)); } catch { return Response.json({ error: "Bad request." }, { status: 400 }); }
  try {
    switch (action) {
      case "join": return Response.json({ ...(await joinCall(userId, id)), iceServers: ICE_SERVERS });
      case "publish": {
        const tracks = Array.isArray(b.tracks) ? b.tracks.map((t: { mid?: unknown; name?: unknown }) => ({ mid: str(t?.mid, 8), name: str(t?.name, 8) })).filter((t) => t.mid && t.name) : [];
        return Response.json(await publish(userId, id, str(b.sdp, MAX_BODY), tracks));
      }
      case "subscribe": {
        const wants = Array.isArray(b.tracks) ? b.tracks.map((t: { userId?: unknown; name?: unknown }) => ({ userId: str(t?.userId, 64), name: str(t?.name, 8) })).filter((t) => t.userId && t.name) : [];
        return Response.json(await subscribe(userId, id, wants));
      }
      case "answer": await answer(userId, id, str(b.sdp, MAX_BODY)); return Response.json({ ok: true });
      case "leave": await leaveCall(userId, id); return Response.json({ ok: true });
      case "decline": await declineCall(userId, id); return Response.json({ ok: true });
      default: return Response.json({ error: "Not found" }, { status: 404 });
    }
  } catch (e) {
    if (e instanceof CallError) return Response.json({ error: e.message }, { status: e.status });
    console.error("call", action, e);
    return Response.json({ error: "The call could not connect. Try again." }, { status: 502 });
  }
}
