import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { addMembers, groupDetail, membership, removeMember } from "@/lib/groups";

type Ctx = { params: Promise<{ id: string }> };

async function asAdmin(req: Request, { params }: Ctx) {
  const userId = await userIdFrom(req);
  if (!userId) return { res: Response.json({ error: "unauthenticated" }, { status: 401 }) };
  const rl = await limited(req, "WRITES", userId);
  if (rl) return { res: rl };
  const id = (await params).id;
  const m = await membership(userId, id);
  if (!m) return { res: Response.json({ error: "Group not found." }, { status: 404 }) };
  if (m.group.ownerId !== userId) return { res: Response.json({ error: "Only the admin can change who is in the group." }, { status: 403 }) };
  return { userId, id };
}

/** POST /api/groups/<id>/members { members: [friend ids] }: the admin adds friends, up to 30 people in all. */
export async function POST(req: Request, ctx: Ctx) {
  const a = await asAdmin(req, ctx);
  if ("res" in a) return a.res;
  const b = (await readJson(req)) as { members?: unknown } | null;
  const ids = Array.isArray(b?.members) ? b.members.filter((m): m is string => typeof m === "string").slice(0, 60) : [];
  const error = await addMembers(a.userId, a.id, ids);
  if (error) return Response.json({ error }, { status: 400 });
  return Response.json({ group: await groupDetail(a.id) });
}

/** DELETE /api/groups/<id>/members?user=<id>: the admin removes someone (never themselves; they delete the group). */
export async function DELETE(req: Request, ctx: Ctx) {
  const a = await asAdmin(req, ctx);
  if ("res" in a) return a.res;
  const target = new URL(req.url).searchParams.get("user") ?? "";
  if (!target || target === a.userId) return Response.json({ error: "Choose someone to remove." }, { status: 400 });
  await removeMember(a.id, target);
  return Response.json({ group: await groupDetail(a.id) });
}
