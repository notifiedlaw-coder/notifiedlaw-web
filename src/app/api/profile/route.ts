import { eq } from "drizzle-orm";
import { getDb, studentOf, userIdFrom } from "@/lib/auth";
import { profile, student } from "@/db/schema";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { isLevel, parseProfile } from "@/lib/profile";
import { normalizeStudentId } from "@/lib/student";

/**
 * Saves the onboarding answers or an edited profile (creates or replaces the user's profile). A student
 * account is always status student at the university of its email, and must give a student ID once; that ID
 * can back only one account per university.
 */
export async function PUT(req: Request) {
  const id = await userIdFrom(req);
  if (!id) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "WRITES", id);
  if (rl) return rl;
  const body = (await readJson(req)) as Record<string, unknown> | null;
  const st = await studentOf(id);
  const p = parseProfile(st ? { ...body, status: "student", university: st.university } : body);
  if (typeof p === "string") return Response.json({ error: p }, { status: 400 });
  let studentId = st?.studentId ?? null;
  if (st && (body?.studentId !== undefined || !studentId)) {
    studentId = normalizeStudentId(body?.studentId);
    if (!studentId) return Response.json({ error: "Enter your student ID: 4 to 20 letters, digits, / or -." }, { status: 400 });
  }
  const now = new Date();
  const orNull = (v: string) => v || null;
  const row = {
    ...p, middleName: orNull(p.middleName), phone: orNull(p.phone), university: orNull(p.university), level: orNull(p.level),
    jobTitle: orNull(p.jobTitle), employer: orNull(p.employer), sector: orNull(p.sector), intent: orNull(p.intent),
    goals: JSON.stringify(p.goals), updatedAt: now,
  };
  const db = getDb();
  const save = db.insert(profile).values({ userId: id, createdAt: now, ...row }).onConflictDoUpdate({ target: profile.userId, set: row });
  try {
    if (st && studentId !== st.studentId) await db.batch([db.update(student).set({ studentId }).where(eq(student.userId, id)), save]);
    else await save;
  } catch {
    // The only constraint the batch can break: this student ID is on another account at the same university.
    return Response.json({ error: "This student ID is already linked to another NotifiedLaw account. If it is yours, email notifiedlaw@gmail.com." }, { status: 409 });
  }
  // The cleaned profile comes back so the client shows exactly what was stored.
  return Response.json({ ok: true, profile: p });
}

/** Changes the level after onboarding (Settings). */
export async function PATCH(req: Request) {
  const id = await userIdFrom(req);
  if (!id) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "WRITES", id);
  if (rl) return rl;
  const level = ((await readJson(req)) as { level?: unknown } | null)?.level;
  if (!isLevel(level)) return Response.json({ error: "Unknown level." }, { status: 400 });
  const res = await getDb().update(profile).set({ level, updatedAt: new Date() }).where(eq(profile.userId, id));
  return res.meta.changes ? Response.json({ ok: true }) : Response.json({ error: "Finish onboarding first." }, { status: 409 });
}
