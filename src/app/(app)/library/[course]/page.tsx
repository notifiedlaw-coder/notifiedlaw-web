import Link from "next/link";
import { notFound } from "next/navigation";
import { findCourse } from "@/lib/data";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ course: string }>;
}) {
  const { course: slug } = await params;
  const hit = findCourse(slug);
  if (!hit) notFound();
  const { course, level } = hit;

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-5 px-5 py-8 lg:px-10">
      <div>
        <div
          className="text-xs font-semibold uppercase tracking-[0.05em]"
          style={{ color: course.color }}
        >
          Level {level} · {course.code}
        </div>
        <h1 className="mt-1 text-3xl font-bold tracking-[-0.02em]">{course.title}</h1>
      </div>
      <ol className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-card">
        {course.topics.map((t, i) => (
          <li key={t} className="border-b border-black/5 last:border-0">
            <Link
              href={`/library/${course.slug}/${i + 1}`}
              className="flex items-center gap-3.5 px-5 py-4 hover:bg-black/[0.02]"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <span
                className="flex size-7 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: course.color }}
              >
                {i + 1}
              </span>
              <span className="flex-1 text-[15px] font-medium">{t}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
