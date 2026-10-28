"use client";

import Link from "next/link";
import { Btn, Chevron, Empty, LevelSelect, Page, Title } from "@/components/ui";
import { Icon } from "@/components/icons";
import { usePlan, useStudyLevel } from "@/components/plan";
import { abbr, bySemester, FREE_TOPICS, isMaxLevel, LEVEL_LABEL, type Course, type Level, type TopicInfo } from "@/lib/data";

export function TopicRow({ slug, i, topic, locked, lockLabel = "Senior Judicial (Pro)" }: { slug: string; i: number; topic: TopicInfo; locked: boolean; lockLabel?: string }) {
  const body = (
    <>
      <span className="w-[22px] text-[13px] tabular-nums text-ink/40">{i + 1}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium" style={{ opacity: locked || !topic.ready ? 0.55 : 1 }}>{topic.title}</span>
        {topic.ready && <span className="text-xs text-faint">{topic.mins} min read · {topic.chapters} {topic.chapters === 1 ? "chapter" : "chapters"}</span>}
      </span>
    </>
  );
  const cls = "flex h-[52px] items-center gap-3.5 border-t border-edge/[0.06] px-4 first:border-0";
  if (!topic.ready) {
    return <div className={cls}>{body}<span className="text-xs text-faint">Coming soon</span></div>;
  }
  return (
    <Link href={locked ? "/plans" : `/library/${slug}/${i + 1}`} className={`${cls} hover:bg-hover`} style={{ textDecoration: "none", color: "inherit" }}>
      {body}
      {locked ? (
        <span className="flex items-center gap-1.5 text-xs text-faint"><Icon name="lock" size={12} />{lockLabel}</span>
      ) : i < FREE_TOPICS ? (
        <span className="rounded-[5px] bg-green/15 px-[7px] py-0.5 text-[11px] font-semibold text-[#248A3D]">FREE</span>
      ) : null}
      <Chevron />
    </Link>
  );
}

export function LibraryView({ courses }: { courses: Record<Level, Course[]> }) {
  const [level, setLevel] = useStudyLevel();
  const { pro, max } = usePlan();
  const maxOnly = isMaxLevel(level) && !max;
  return (
    <Page>
      <Title
        title="Library"
        sub="Course notes by level"
        right={<LevelSelect value={level} onChange={setLevel} />}
      />
      {!pro && (
        <div className="hidden flex-wrap items-center gap-3 rounded-xl bg-surface px-4 py-3 shadow-card md:flex">
          <Icon name="lock" size={14} />
          <div className="min-w-0 flex-1 text-[13px]">
            <b>You’re on Attorney (Free).</b>{" "}
            <span className="text-ink/70">The first two topics of every course are open. Senior Judicial (Pro) unlocks all levels from 100 to 400. Pre-Bar and the Bar Course come with Supreme Justice (Max).</span>
          </div>
          <Btn href="/plans">See plans</Btn>
        </div>
      )}
      {maxOnly && pro && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface px-4 py-3 shadow-card">
          <Icon name="lock" size={14} />
          <div className="min-w-0 flex-1 text-[13px]"><b>{LEVEL_LABEL[level]} is a Supreme Justice (Max) course.</b> <span className="text-ink/70">Upgrade to open every topic.</span></div>
          <Btn href="/plans">See plans</Btn>
        </div>
      )}
      {courses[level].length === 0 && <Empty title={`No courses for ${LEVEL_LABEL[level]} yet`}>Courses are added from the NotifiedLaw content database and appear here once they are published.</Empty>}
      {bySemester(courses[level]).map((sem) => (
        <div key={sem.semester} className="flex flex-col gap-4">
          <h2 className="px-1 text-[13px] font-bold uppercase tracking-[0.05em] text-muted">{sem.label}</h2>
          {sem.courses.map((c) => (
          <section key={c.slug} className="flex flex-col gap-2">
            <Link href={`/library/${c.slug}`} className="flex items-center gap-2.5 px-1" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="flex size-7 items-center justify-center rounded-lg text-[11px] font-bold text-white" style={{ background: c.color }}>{abbr(c.title)}</span>
              <span className="text-[17px] font-semibold">{c.title}</span>
            </Link>
            <div className="overflow-hidden rounded-xl bg-surface shadow-card">
              {c.topics.map((t, i) => (
                <TopicRow key={t.title + i} slug={c.slug} i={i} topic={t} locked={maxOnly || (!pro && i >= FREE_TOPICS)} lockLabel={maxOnly ? "Supreme Justice (Max)" : undefined} />
              ))}
              {c.topics.length === 0 && <div className="px-4 py-3.5 text-[13px] text-muted">Topics will appear here once they are added.</div>}
            </div>
          </section>
        ))}
        </div>
      ))}
    </Page>
  );
}
