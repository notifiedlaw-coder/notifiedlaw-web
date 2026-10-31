import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { cleanGroupName, deleteGroup, groupDetail, membership, removeMember, renameGroup } from "@/lib/groups";
import { deleteAvatar } from "@/lib/avatars";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/groups/<id>: the group and its members, for a member. */
export async function GET(req: Request, { params }: Ctx) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "READS", userId);
  if (rl) return rl;
  const id = (await params).id;
  if (!(await membership(userId, id))) return Response.json({ error: "Group not found." }, { status: 404 });
  return Response.json({ group: await groupDetail(id) });
}

/** PATCH /api/groups/<id> { name }: renames the group (admin only). */
export async function PATCH(req: Request, { params }: Ctx) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  const id = (await params).id;
  const m = await membership(userId, id);
  if (!m) return Response.json({ error: "Group not found." }, { status: 404 });
  if (m.group.ownerId !== userId) return Response.json({ error: "Only the admin can rename the group." }, { status: 403 });
  const name = cleanGroupName(((await readJson(req)) as { name?: unknown } | null)?.name);
  if (typeof name !== "string") return Response.json(name, { status: 400 });
  await renameGroup(id, name);
  return Response.json({ group: await groupDetail(id) });
}

/** DELETE /api/groups/<id>: the admin deletes the group with its messages; anyone else leaves it. */
export async function DELETE(req: Request, { params }: Ctx) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  const id = (await params).id;
  const m = await membership(userId, id);
  if (!m) return Response.json({ ok: true });
  if (m.group.ownerId === userId) {
    await deleteGroup(id);
    await deleteAvatar(m.group.avatarKey);
  } else await removeMember(id, userId);
  return Response.json({ ok: true });
}
