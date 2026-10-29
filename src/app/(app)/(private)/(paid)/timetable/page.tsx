import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { timetable } from "@/db/schema";
import { getDb, getSession } from "@/lib/auth";
import { getCourses } from "@/lib/cms";
import type { TimetableInput } from "@/lib/timetable";
import { Timetable } from "./timetable";

export const metadata = { title: "TimeTable" };

// Each user's own timetable, read on request.
export const dynamic = "force-dynamic";

export default async function Page() {
  const s = await getSession();
  if (!s) redirect("/login");
  const [[row], courses] = await Promise.all([
    getDb().select({ input: timetable.input }).from(timetable).where(eq(timetable.userId, s.user.id)),
    getCourses(),
  ]);
  // Library course titles, offered as suggestions when naming a course.
  const suggestions = [...new Set(Object.values(courses).flat().map((c) => c.title))].sort();
  return <Timetable initial={row ? (JSON.parse(row.input) as TimetableInput) : null} suggestions={suggestions} />;
}
