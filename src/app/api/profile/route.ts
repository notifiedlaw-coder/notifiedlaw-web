import { eq } from "drizzle-orm";
import { getDb, userIdFrom } from "@/lib/auth";
import { profile } from "@/db/schema";
import { readJson } from "@/lib/http";
import { isLevel, parseProfile } from "@/lib/profile";

/** Saves the onboarding answers (creates or replaces the user's profile). */
export async function PUT(req: Request) {
  const id = await userIdFrom(req);
  if (!id) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const p = parseProfile(await readJson(req));
  if (typeof p === "string") return Response.json({ error: p }, { status: 400 });
  const now = new Date();
  const row = { ...p, goals: JSON.stringify(p.goals), updatedAt: now };
  await getDb().insert(profile).values({ userId: id, createdAt: now, ...row })
    .onConflictDoUpdate({ target: profile.userId, set: row });
  return Response.json({ ok: true });
}

/** Changes the level after onboarding (Settings). */
export async function PATCH(req: Request) {
  const id = await userIdFrom(req);
  if (!id) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const level = ((await readJson(req)) as { level?: unknown } | null)?.level;
  if (!isLevel(level)) return Response.json({ error: "Unknown level." }, { status: 400 });
  const res = await getDb().update(profile).set({ level, updatedAt: new Date() }).where(eq(profile.userId, id));
  return res.meta.changes ? Response.json({ ok: true }) : Response.json({ error: "Finish onboarding first." }, { status: 409 });
}
