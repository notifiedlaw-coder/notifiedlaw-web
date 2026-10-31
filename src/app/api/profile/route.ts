import { and, eq, ne } from "drizzle-orm";
import { getDb, studentOf, userIdFrom } from "@/lib/auth";
import { abuseReport, profile, student } from "@/db/schema";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { isLevel, parseProfile } from "@/lib/profile";
import { normalizeStudentId } from "@/lib/student";

/**
 * Saves the onboarding answers or an edited profile (creates or replaces the user's profile). A student
 * account is always status student at the university of its email, and must give a student ID once. An ID can
 * only be typed, not proved, so one already on another account at the same university is saved anyway and both
 * accounts go to review, rather than letting whoever typed it first lock the real student out.
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
  if (st && studentId !== st.studentId) {
    const clash = await db.select({ userId: student.userId }).from(student)
      .where(and(eq(student.university, st.university), eq(student.studentId, studentId!), ne(student.userId, id)));
    await db.batch([
      db.update(student).set({ studentId }).where(eq(student.userId, id)),
      save,
      ...clash.map((c) => db.insert(abuseReport).values({
        id: crypto.randomUUID(), reporterId: id, kind: "student_id", target: c.userId, reason: "Student ID already on another account",
        snapshot: JSON.stringify({ university: st.university, studentId }), createdAt: now,
      })),
    ]);
  } else await save;
  // The cleaned profile comes back so the client shows exactly what was stored.
  return Response.json({ ok: true, profile: p });
}

/** Changes the level, or whether the account can be found by email, after onboarding (Settings). */
export async function PATCH(req: Request) {
  const id = await userIdFrom(req);
  if (!id) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "WRITES", id);
  if (rl) return rl;
  const b = (await readJson(req)) as { level?: unknown; findByEmail?: unknown } | null;
  const set: { level?: string; findByEmail?: boolean } = {};
  if (b?.level !== undefined) {
    if (!isLevel(b.level)) return Response.json({ error: "Unknown level." }, { status: 400 });
    set.level = b.level;
  }
  if (b?.findByEmail !== undefined) {
    if (typeof b.findByEmail !== "boolean") return Response.json({ error: "findByEmail must be true or false." }, { status: 400 });
    set.findByEmail = b.findByEmail;
  }
  if (!Object.keys(set).length) return Response.json({ error: "Nothing to change." }, { status: 400 });
  const res = await getDb().update(profile).set({ ...set, updatedAt: new Date() }).where(eq(profile.userId, id));
  return res.meta.changes ? Response.json({ ok: true }) : Response.json({ error: "Finish onboarding first." }, { status: 409 });
}
