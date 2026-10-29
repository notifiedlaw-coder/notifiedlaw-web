import { getDb, userIdFrom } from "@/lib/auth";
import { userFolder } from "@/db/schema";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { MAX_FOLDERS, MAX_FOLDER_DEPTH, cleanFolderName, depthOf, foldersOf, quotaFor } from "@/lib/files";

/** Creates a folder, at the top level or inside one of the user's own folders. */
export async function POST(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  if (!(await quotaFor(userId))) return Response.json({ error: "Choose a plan to use My Files." }, { status: 402 });
  const body = (await readJson(req)) as { name?: unknown; parentId?: unknown } | null;
  const name = cleanFolderName(body?.name);
  if (!name) return Response.json({ error: "Give the folder a name." }, { status: 400 });
  const all = await foldersOf(userId);
  if (all.length >= MAX_FOLDERS) return Response.json({ error: `You can have up to ${MAX_FOLDERS} folders.` }, { status: 409 });
  const parentId = typeof body?.parentId === "string" ? body.parentId : null;
  if (parentId && !all.some((f) => f.id === parentId)) return Response.json({ error: "Folder not found." }, { status: 404 });
  if (depthOf(all, parentId) >= MAX_FOLDER_DEPTH) return Response.json({ error: `Folders can be nested up to ${MAX_FOLDER_DEPTH} deep.` }, { status: 409 });
  const folder = { id: crypto.randomUUID(), userId, parentId, name, createdAt: new Date() };
  await getDb().insert(userFolder).values(folder);
  return Response.json({ id: folder.id, name, parentId, createdAt: folder.createdAt.getTime() }, { status: 201 });
}
