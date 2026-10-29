import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getCourses } from "@/lib/cms";
import { timetableFor } from "@/lib/timetable-db";
import { Timetable } from "./timetable";

export const metadata = { title: "TimeTable" };

// Each user's own timetable, read on request.
export const dynamic = "force-dynamic";

export default async function Page() {
  const s = await getSession();
  if (!s) redirect("/login");
  const [initial, courses] = await Promise.all([timetableFor(s.user.id), getCourses()]);
  // Library course titles, offered as suggestions when naming a course.
  const suggestions = [...new Set(Object.values(courses).flat().map((c) => c.title))].sort();
  return <Timetable initial={initial} suggestions={suggestions} />;
}
