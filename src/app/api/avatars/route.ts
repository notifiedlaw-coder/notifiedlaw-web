import { eq } from "drizzle-orm";
import { getDb, userIdFrom } from "@/lib/auth";
import { userAvatar } from "@/db/schema";
import { limited } from "@/lib/rate-limit";
import { readBytes } from "@/lib/http";
import { MAX_AVATAR_UPLOAD, deleteAvatar, pruneAvatars, storeAvatar, toAvatar } from "@/lib/avatars";
import { avatarUrl } from "@/lib/friend-view";

/** POST /api/avatars (the photo as the body): sets the signed-in user's profile picture, as a 256 px WebP. */
export async function POST(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "AVATARS", userId);
  if (rl) return rl;
  const bytes = await readBytes(req, MAX_AVATAR_UPLOAD);
  if (!bytes?.length) return Response.json({ error: "Choose a photo under 8 MB." }, { status: 400 });
  const webp = await toAvatar(bytes);
  if (typeof webp === "string") return Response.json({ error: webp }, { status: 400 });
  const db = getDb();
  const key = await storeAvatar(`u/${userId}`, webp);
  await db.insert(userAvatar).values({ userId, key, updatedAt: new Date() }).onConflictDoUpdate({ target: userAvatar.userId, set: { key, updatedAt: new Date() } });
  // Only the new picture is kept: every earlier one for this user is removed from storage.
  await pruneAvatars(`u/${userId}`, key);
  return Response.json({ avatar: avatarUrl(key) });
}

/** DELETE /api/avatars: removes the signed-in user's profile picture. */
export async function DELETE(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "AVATARS", userId);
  if (rl) return rl;
  const db = getDb();
  const [old] = await db.select().from(userAvatar).where(eq(userAvatar.userId, userId));
  if (old) {
    await db.delete(userAvatar).where(eq(userAvatar.userId, userId));
    await deleteAvatar(old.key);
  }
  await pruneAvatars(`u/${userId}`, "");
  return Response.json({ avatar: null });
}
