import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { createGroup, myGroups } from "@/lib/groups";

/** GET /api/groups: the signed-in user's groups, with last message, unread count and any call in progress. */
export async function GET(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "READS", userId);
  if (rl) return rl;
  return Response.json({ groups: await myGroups(userId) });
}

/** POST /api/groups { name, members: [friend ids] }: creates a group with the user as its only admin. */
export async function POST(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  const b = (await readJson(req)) as { name?: unknown; members?: unknown } | null;
  const members = Array.isArray(b?.members) ? b.members.filter((m): m is string => typeof m === "string").slice(0, 60) : [];
  const r = await createGroup(userId, b?.name, members);
  if ("error" in r) return Response.json(r, { status: 400 });
  return Response.json(r);
}
