import Link from "next/link";
import { notFound } from "next/navigation";
import { Btn, Eyebrow } from "@/components/ui";
import { COURSES, abbr, findCourse, isMaxLevel, LEVEL_LABEL, LEVELS } from "@/lib/data";
import { CourseTopics } from "./course-topics";

export function generateStaticParams() {
  return LEVELS.flatMap((l) => COURSES[l].map((c) => ({ course: c.slug })));
}

const TOOLS = [
  ["AI Summaries", "One per topic", "/library", "PRO"],
  ["Flashcard decks", "5 decks · 112 cards", "/flashcards", ""],
  ["Listen to topics", "AI podcast inside every topic", "/library", "SUPREME JUSTICE"],
  ["Practice questions", "MCQs and problem questions", "/exam-prep", ""],
] as const;

export default async function CoursePage({ params }: { params: Promise<{ course: string }> }) {
  const { course: slug } = await params;
  const hit = findCourse(slug);
  if (!hit) notFound();
  const { course, level } = hit;
  const done = Math.round(course.progress * course.topics.length);

  return (
    <div className="mx-auto grid max-w-[1040px] grid-cols-[minmax(0,1fr)] gap-6 px-5 pb-12 pt-6 md:px-10 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex flex-col gap-5">
        <div className="relative h-40 overflow-hidden rounded-2xl" style={{ background: `linear-gradient(135deg, ${course.color}, ${course.color}66)` }}>
          <div className="absolute bottom-4 left-5 flex items-end gap-4 text-white">
            <div className="flex size-14 items-center justify-center rounded-2xl border-[3px] border-surface bg-white/20 text-xl font-bold">{abbr(course.code)}</div>
            <div>
              <div className="text-xs font-semibold opacity-80">{course.code} · {LEVEL_LABEL[level]}</div>
              <div className="text-[26px] font-bold leading-tight tracking-tight">{course.title}</div>
              <div className="text-[13px] opacity-80">{course.topics.length} topics · {done} completed</div>
            </div>
          </div>
        </div>
        <div className="h-1 rounded-sm bg-track"><div className="h-full rounded-sm" style={{ width: `${course.progress * 100}%`, background: course.color }} /></div>
        <div className="flex flex-wrap gap-2.5">
          <Btn href={`/library/${course.slug}/${Math.min(done + 1, course.topics.length)}`}>Continue course</Btn>
          <Btn href="/flashcards" tone="plain">Review flashcards</Btn>
          <Btn href="/exam-prep" tone="plain">Practice questions</Btn>
        </div>
        <Eyebrow>Topics</Eyebrow>
        <CourseTopics slug={course.slug} topics={course.topics} color={course.color} maxOnly={isMaxLevel(level)} />
      </div>
      <aside className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-2xl bg-surface shadow-card">
          <div className="px-4 pb-1 pt-3.5 text-[13px] font-semibold">Study tools for this course</div>
          {TOOLS.map(([t, s, href, tag]) => (
            <Link key={t} href={href} className="flex items-center gap-3 border-t border-edge/[0.06] px-4 py-3 first:border-0 hover:bg-hover" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="flex-1"><span className="block text-[13px] font-semibold">{t}</span><span className="block text-xs text-muted">{s}</span></span>
              {tag && <span className="rounded bg-fill px-1.5 py-0.5 text-[10px] font-semibold text-muted">{tag}</span>}
            </Link>
          ))}
        </div>
        <Link href="/ai" className="rounded-2xl bg-indigo p-4 text-white" style={{ textDecoration: "none", color: "#fff" }}>
          <div className="text-[15px] font-semibold">Stuck on something?</div>
          <div className="mt-1 text-[13px] opacity-85">Ask Notified AI about {course.title}.</div>
        </Link>
      </aside>
    </div>
  );
}
