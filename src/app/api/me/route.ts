import { meFor, userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";

/** Everything the client shell needs about the signed-in user besides their name. */
export async function GET(req: Request) {
  const id = await userIdFrom(req);
  if (!id) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "READS", id);
  if (rl) return rl;
  return Response.json(await meFor(id), { headers: { "cache-control": "private, no-store" } });
}
