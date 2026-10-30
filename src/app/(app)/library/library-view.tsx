"use client";

import Link from "next/link";
import { Btn, Chevron, Empty, LevelSelect, Page, Title } from "@/components/ui";
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
      <span className="line-clamp-2 text-sm font-medium sm:line-clamp-none sm:truncate" style={{ opacity: locked || !topic.ready ? 0.55 : 1 }}>{topic.title}</span>
      {topic.ready && <span className="text-xs text-faint">{topic.mins} min read · {topic.chapters} {topic.chapters === 1 ? "chapter" : "chapters"}</span>}
    </span>
  );
  const num = <span className="w-[22px] text-[13px] tabular-nums text-ink/40">{i + 1}</span>;
  const cls = "flex min-h-[52px] items-center gap-3.5 border-t py-2.5 sm:py-0 border-edge/[0.06] px-4 first:border-0";
  if (!topic.ready) {
    return <div className={cls}>{num}{info}<span className="text-xs text-faint">Coming soon</span></div>;
  }
  const tail = (
    <>
      {locked ? (
        <span className="flex items-center gap-1.5 text-xs text-faint"><Icon name="lock" size={12} />{lockLabel}</span>
      ) : preview && i < PREVIEW_TOPICS ? (
        <span className="rounded-[5px] bg-green/15 px-[7px] py-0.5 text-[11px] font-semibold text-[#248A3D]">PREVIEW</span>
      ) : null}
      <Chevron />
    </>
  );
  const href = locked ? "/plans" : `/library/${slug}/${i + 1}`;
  const link = { textDecoration: "none", color: "inherit" };
  if (onToggle && !locked) {
    return (
      <div className={`${cls} gap-1.5 pl-1.5 hover:bg-hover`}>
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
      <Title
        title="Library"
        sub="Course notes by level"
        right={<LevelSelect value={level} onChange={setLevel} />}
      />
      {!paid && (
        <div className="hidden flex-wrap items-center gap-3 rounded-xl bg-surface px-4 py-3 shadow-card md:flex">
          <Icon name="lock" size={14} />
          <div className="min-w-0 flex-1 text-[13px]">
            <b>You don’t have a plan yet.</b>{" "}
            <span className="text-ink/70">The first two topics of every course are open as a preview. Student unlocks every topic from Level 100 to 400. Pre-Bar and the Bar Course come with Supreme Justice (Max).</span>
          </div>
          <Btn href="/plans">See plans</Btn>
        </div>
      )}
      {maxOnly && paid && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface px-4 py-3 shadow-card">
          <Icon name="lock" size={14} />
          <div className="min-w-0 flex-1 text-[13px]"><b>{LEVEL_LABEL[level]} is a Supreme Justice (Max) course.</b> <span className="text-ink/70">Upgrade to open every topic.</span></div>
          <Btn href="/plans">See plans</Btn>
        </div>
      )}
      {progress.error && <p role="alert" className="m-0 rounded-xl bg-red/10 px-4 py-2.5 text-[13px]">{progress.error}</p>}
      {courses[level].length === 0 && <Empty title={`No courses for ${LEVEL_LABEL[level]} yet`}>Courses are added from the NotifiedLaw content database and appear here once they are published.</Empty>}
      {bySemester(courses[level]).map((sem, n) => (
        <div key={sem.semester} className={`flex flex-col gap-4 ${n ? "mt-8" : ""}`}>
          {/* Pinned while its courses scroll past, so it is always clear which semester you are in. */}
          <div className="sticky top-0 z-10 -mx-5 flex items-baseline justify-between gap-3 border-b-[0.5px] border-edge/15 bg-canvas/85 px-5 py-3 backdrop-blur-xl backdrop-saturate-150 md:-mx-10 md:px-10">
            <h2 className="m-0 text-[22px] font-bold tracking-[-0.02em]">{sem.label}</h2>
            <span className="text-[13px] text-muted">{sem.courses.length} {sem.courses.length === 1 ? "course" : "courses"}</span>
          </div>
          {sem.courses.map((c) => {
          const ready = c.topics.filter((t) => t.ready);
          const studied = progress.done ? ready.filter((t) => progress.done!.has(t.id)).length : 0;
          return (
          <section key={c.slug} className="flex flex-col gap-2">
            <div className="flex items-center gap-3 px-1">
              <Link href={`/library/${c.slug}`} className="flex min-w-0 items-center gap-1.5 hover:opacity-70" style={{ textDecoration: "none", color: "inherit" }}>
                <span className="truncate text-[17px] font-semibold tracking-[-0.01em]" style={{ color: c.color }}>{c.title}</span>
                <Chevron />
              </Link>
              {progress.done && ready.length > 0 && (
                <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[12px] tabular-nums text-muted" aria-label={`${studied} of ${ready.length} topics studied`}>
                  <Ring value={studied / ready.length} />{studied}/{ready.length}
                </span>
              )}
            </div>
            <div className="overflow-hidden rounded-xl bg-surface shadow-card">
              {c.topics.map((t, i) => (
                <TopicRow key={t.title + i} slug={c.slug} i={i} topic={t} locked={maxOnly || (!paid && i >= PREVIEW_TOPICS)} preview={!paid} lockLabel={maxOnly ? "Supreme Justice (Max)" : undefined}
                  done={progress.done?.has(t.id)} onToggle={progress.done ? (on) => progress.toggle(t.id, on) : undefined} />
              ))}
              {c.topics.length === 0 && <div className="px-4 py-3.5 text-[13px] text-muted">Topics will appear here once they are added.</div>}
            </div>
          </section>
          );
        })}
        </div>
      ))}
    </Page>
  );
}

/** A small progress ring, as in Fitness: green around a grey track, full when every topic is studied. */
function Ring({ value }: { value: number }) {
  const r = 6;
  const c = 2 * Math.PI * r;
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="-rotate-90" aria-hidden>
      <circle cx="8" cy="8" r={r} fill="none" stroke="var(--color-track)" strokeWidth="2.5" />
      {value > 0 && <circle cx="8" cy="8" r={r} fill="none" stroke="var(--color-green)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${c * value} ${c}`} />}
    </svg>
  );
}
