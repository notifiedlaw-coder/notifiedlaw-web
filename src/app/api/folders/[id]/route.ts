import { and, eq, inArray } from "drizzle-orm";
import { getDb, userIdFrom } from "@/lib/auth";
import { userFile, userFolder } from "@/db/schema";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { MAX_FOLDER_DEPTH, cleanFolderName, depthOf, dropFiles, foldersOf, subtree } from "@/lib/files";

type Ctx = { params: Promise<{ id: string }> };

/** Renames a folder and/or moves it into another of the user's folders (or the top level, parentId null). */
export async function PATCH(req: Request, { params }: Ctx) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  const id = (await params).id;
  const all = await foldersOf(userId);
  const folder = all.find((f) => f.id === id);
  if (!folder) return Response.json({ error: "Not found" }, { status: 404 });
  const body = (await readJson(req)) as { name?: unknown; parentId?: unknown } | null;
  const set: { name?: string; parentId?: string | null } = {};
  if (body?.name !== undefined) {
    const name = cleanFolderName(body.name);
    if (!name) return Response.json({ error: "Give the folder a name." }, { status: 400 });
    set.name = name;
  }
  if (body?.parentId !== undefined) {
    const parentId = typeof body.parentId === "string" ? body.parentId : null;
    const inside = subtree(all, id);
    if (parentId && (!all.some((f) => f.id === parentId) || inside.has(parentId))) return Response.json({ error: "A folder cannot go inside itself." }, { status: 409 });
    // The moved folder keeps its own subfolders, so the deepest of them must still fit.
    const below = Math.max(...[...inside].map((f) => depthOf(all, f) - depthOf(all, id)));
    if (depthOf(all, parentId) + 1 + below > MAX_FOLDER_DEPTH) return Response.json({ error: `Folders can be nested up to ${MAX_FOLDER_DEPTH} deep.` }, { status: 409 });
    set.parentId = parentId;
  }
  if (!Object.keys(set).length) return Response.json({ error: "Nothing to change." }, { status: 400 });
  await getDb().update(userFolder).set(set).where(and(eq(userFolder.id, id), eq(userFolder.userId, userId)));
  return Response.json({ ok: true, ...set });
}

/** Deletes a folder with everything inside it: subfolders and their files. */
export async function DELETE(req: Request, { params }: Ctx) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  const id = (await params).id;
  const all = await foldersOf(userId);
  if (!all.some((f) => f.id === id)) return Response.json({ error: "Not found" }, { status: 404 });
  const ids = [...subtree(all, id)];
  const db = getDb();
  for (let i = 0; i < ids.length; i += 90) {
    const part = ids.slice(i, i + 90);
    await dropFiles(await db.select({ id: userFile.id, key: userFile.key }).from(userFile).where(and(eq(userFile.userId, userId), inArray(userFile.folderId, part))));
    await db.delete(userFolder).where(and(eq(userFolder.userId, userId), inArray(userFolder.id, part)));
  }
  return Response.json({ ok: true, folders: ids });
}
