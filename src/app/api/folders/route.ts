import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { apiError } from "@/lib/error-codes";
import { MAX_FOLDERS, MAX_FOLDER_DEPTH, addFolder, cleanFolderName, depthOf, foldersOf, nameTaken, quotaFor } from "@/lib/files";

/** Creates a folder, at the top level or inside one of the user's own folders. Names are unique in each place. */
export async function POST(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return apiError("A001", 401);
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  if (!(await quotaFor(userId))) return apiError("D301", 402);
  const body = (await readJson(req)) as { name?: unknown; parentId?: unknown } | null;
  const name = cleanFolderName(body?.name);
  if (!name) return apiError("D302", 400);
  const all = await foldersOf(userId);
  if (all.length >= MAX_FOLDERS) return apiError("D303", 409);
  const parentId = typeof body?.parentId === "string" ? body.parentId : null;
  if (parentId && !all.some((f) => f.id === parentId)) return apiError("D304", 404);
  if (depthOf(all, parentId) >= MAX_FOLDER_DEPTH) return apiError("D305", 409);
  if (nameTaken(all, parentId, name)) return apiError("D306", 409);
  const folder = { id: crypto.randomUUID(), userId, parentId, name, createdAt: new Date() };
  if (!(await addFolder(folder))) return apiError("D306", 409);
  return Response.json({ id: folder.id, name, parentId, createdAt: folder.createdAt.getTime() }, { status: 201 });
}
