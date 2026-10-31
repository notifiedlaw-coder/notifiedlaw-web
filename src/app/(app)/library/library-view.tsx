"use client";

import Link from "next/link";
import { Btn, Chevron, Empty, LevelSelect, Page } from "@/components/ui";
import { Icon } from "@/components/icons";
import { usePlan, useStudyLevel } from "@/components/plan";
import { CheckCircle, useProgress } from "@/components/progress";
import { bySemester, PREVIEW_TOPICS, isMaxLevel, LEVEL_LABEL, type Course, type Level, type TopicInfo } from "@/lib/data";

/**
 * A topic in a course's list. For a signed-in reader with the topic open, a round check on the left marks it as
 * studied (`done` and `onToggle`); otherwise the topic's number shows there.
 */
export function TopicRow({ slug, i, topic, locked, preview = false, lockLabel = "Student", done, onToggle }: { slug: string; i: number; topic: TopicInfo; locked: boolean; preview?: boolean; lockLabel?: string; done?: boolean; onToggle?: (on: boolean) => void }) {
  const info = (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="line-clamp-2 text-[16px] sm:line-clamp-none sm:truncate" style={{ opacity: locked || !topic.ready ? 0.55 : 1 }}>{topic.title}</span>
      {topic.ready && <span className="text-[13px] text-faint">{topic.mins} min read · {topic.chapters} {topic.chapters === 1 ? "chapter" : "chapters"}</span>}
    </span>
  );
  const num = <span className="grid size-7 shrink-0 place-items-center rounded-full bg-fill text-[13px] font-bold tabular-nums">{i + 1}</span>;
  const cls = "flex min-h-[60px] items-center gap-3.5 border-t border-edge/[0.07] px-[18px] py-3 first:border-0";
  if (!topic.ready) {
    return <div className={cls}>{num}{info}<span className="text-[13px] text-faint">Coming soon</span></div>;
  }
  const tail = (
    <>
      {locked ? (
        <span className="flex items-center gap-1.5 text-[13px] text-faint"><Icon name="lock" size={12} />{lockLabel}</span>
      ) : preview && i < PREVIEW_TOPICS ? (
        <span className="rounded-full bg-peach px-2.5 py-1 text-[12px] font-bold text-[var(--peach-fg)]">Preview</span>
      ) : null}
      <Chevron />
    </>
  );
  const href = locked ? "/plans" : `/library/${slug}/${i + 1}`;
  const link = { textDecoration: "none", color: "inherit" };
  if (onToggle && !locked) {
    return (
      <div className={`${cls} gap-1.5 pl-2.5 hover:bg-hover`}>
        <button type="button" onClick={() => onToggle(!done)} aria-pressed={!!done} aria-label={`${topic.title}: ${done ? "studied" : "not studied yet"}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full active:scale-90 motion-safe:transition-transform">
          <CheckCircle on={!!done} />
        </button>
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-3.5 self-stretch" style={link}>{info}{tail}</Link>
      </div>
    );
  }
  return <Link href={href} className={`${cls} hover:bg-hover`} style={link}>{num}{info}{tail}</Link>;
}

/** `completed`: ids of the topics the reader has studied, or null for a guest. */
export function LibraryView({ courses, completed }: { courses: Record<Level, Course[]>; completed: string[] | null }) {
  const [level, setLevel] = useStudyLevel();
  const { paid, max } = usePlan();
  const progress = useProgress(completed);
  const maxOnly = isMaxLevel(level) && !max;
  return (
    <Page>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-[38px] leading-[1.02] md:text-[46px] lg:text-[56px]">{LEVEL_LABEL[level]} courses</h1>
          <p className="m-0 text-[17px] text-muted">Notes matched to your faculty outline.</p>
        </div>
        <LevelSelect value={level} onChange={setLevel} />
      </header>
      {!paid && (
        <div className="flex flex-wrap items-center gap-3 rounded-[18px] bg-tint px-5 py-4">
          <div className="min-w-0 flex-1 text-[15px]">
            <b>The first two topics of every course are open as a preview.</b>{" "}
            <span className="text-muted">Student unlocks every topic from Level 100 to 400.</span>
          </div>
          <Btn href="/plans">See plans</Btn>
        </div>
      )}
      {maxOnly && paid && (
        <div className="flex flex-wrap items-center gap-3 rounded-[18px] bg-tint px-5 py-4">
          <div className="min-w-0 flex-1 text-[15px]"><b>{LEVEL_LABEL[level]} is a Supreme Justice (Max) course.</b> <span className="text-muted">Upgrade to open every topic.</span></div>
          <Btn href="/plans">See plans</Btn>
        </div>
      )}
      {progress.error && <p role="alert" className="m-0 rounded-xl bg-red/10 px-4 py-2.5 text-[13px]">{progress.error}</p>}
      {courses[level].length === 0 && <Empty title={`No courses for ${LEVEL_LABEL[level]} yet`}>Courses are added from the NotifiedLaw content database and appear here once they are published.</Empty>}
      {/* Hick's law: one card per course; the topics open on the course page. */}
      {bySemester(courses[level]).map((sem) => (
        <section key={sem.semester} className="flex flex-col gap-3.5">
          <div className="flex items-baseline justify-between gap-3 border-b border-edge/[0.12] pb-2">
            <h2 className="m-0 text-[26px]">{sem.label}</h2>
            <span className="text-[14px] text-faint">{sem.courses.length} {sem.courses.length === 1 ? "course" : "courses"}</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5">
            {sem.courses.map((c) => {
              const ready = c.topics.filter((t) => t.ready);
              const studied = progress.done ? ready.filter((t) => progress.done!.has(t.id)).length : 0;
              const pct = ready.length ? Math.round((studied / ready.length) * 100) : 0;
              return (
                <Link key={c.slug} href={`/library/${c.slug}`} className="flex flex-col overflow-hidden rounded-2xl border border-edge/10 bg-surface transition-shadow hover:shadow-card-hover" style={{ textDecoration: "none", color: "inherit" }}>
                  <span aria-hidden className="h-1.5" style={{ background: c.color }} />
                  <span className="flex min-h-32 flex-col gap-2.5 p-[18px]">
                    <span className="font-display text-[24px] leading-[1.1]">{c.title}</span>
                    <span className="flex-1" />
                    {progress.done && ready.length > 0 && (
                      <span className="h-1 overflow-hidden rounded-full bg-fill" role="progressbar" aria-label={`${studied} of ${ready.length} topics read`} aria-valuemin={0} aria-valuemax={ready.length} aria-valuenow={studied}>
                        <span className="block h-full" style={{ width: `${pct}%`, background: c.color }} />
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-[14px] text-faint">
                      {maxOnly && <Icon name="lock" size={12} />}
                      {c.topics.length === 0
                        ? "Topics coming soon"
                        : progress.done && ready.length > 0
                          ? `${studied} of ${ready.length} topics read`
                          : `${c.topics.length} topics · ${ready.length} available`}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </Page>
  );
}
