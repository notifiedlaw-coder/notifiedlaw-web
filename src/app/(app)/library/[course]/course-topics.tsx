"use client";

import Link from "next/link";
import { usePlan } from "@/components/plan";
import { useProgress } from "@/components/progress";
import { PREVIEW_TOPICS, type TopicInfo } from "@/lib/data";
import { TopicRow } from "../library-view";

/**
 * A course's topics. A signed-in reader also sees how many they have studied and the next topic to read.
 * `completed` is null for a guest.
 */
export function CourseTopics({ slug, topics, completed, maxOnly = false }: { slug: string; topics: TopicInfo[]; completed: string[] | null; maxOnly?: boolean }) {
  const { paid, max } = usePlan();
  const gated = maxOnly && !max;
  const progress = useProgress(completed);
  const done = progress.done;
  const locked = (i: number) => gated || (!paid && i >= PREVIEW_TOPICS);
  const ready = topics.filter((t) => t.ready);
  const studied = done ? ready.filter((t) => done.has(t.id)).length : 0;
  const nextAt = done ? topics.findIndex((t, i) => t.ready && !locked(i) && !done.has(t.id)) : -1;

  return (
    <>
      {done && ready.length > 0 && (
        <div className="flex items-center gap-3 text-[15px] text-muted">
          <span className="h-1.5 max-w-[240px] flex-1 overflow-hidden rounded-full bg-track" role="progressbar" aria-label={`${studied} of ${ready.length} topics read`} aria-valuemin={0} aria-valuemax={ready.length} aria-valuenow={studied}>
            <span className="block h-full bg-blue" style={{ width: `${Math.round((studied / ready.length) * 100)}%` }} />
          </span>
          {studied} of {ready.length} topics read
        </div>
      )}
      {/* Hick's law: the next unread topic is the one primary action; the list is secondary. */}
      {nextAt >= 0 ? (
        <Link href={`/library/${slug}/${nextAt + 1}`} className="flex items-center gap-4 rounded-[18px] bg-[#23305C] px-6 py-[22px] text-[#F6F5F2]! hover:bg-[#1F2B54]" style={{ textDecoration: "none" }}>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-[13px] font-semibold text-[#C5CDE6]">{studied ? "Continue" : "Start"} · Topic {nextAt + 1}</span>
            <span className="font-display text-[28px] leading-[1.1]">{topics[nextAt].title}</span>
          </span>
          <span aria-hidden className="text-[24px]">→</span>
        </Link>
      ) : done && ready.length > 0 && studied === ready.length ? (
        <p className="m-0 rounded-[18px] bg-tint px-6 py-5 text-[16px] font-semibold text-link">Every available topic read.</p>
      ) : null}
      {progress.error && <p role="alert" className="m-0 text-[14px] text-red">{progress.error}</p>}
      <div className="overflow-hidden rounded-[18px] border border-edge/10 bg-surface">
        {topics.map((t, i) => (
          <TopicRow key={t.title + i} slug={slug} i={i} topic={t} locked={locked(i)} preview={!paid} lockLabel={gated ? "Supreme Justice (Max)" : undefined}
            done={done?.has(t.id)} onToggle={done ? (on) => progress.toggle(t.id, on) : undefined} />
        ))}
        {topics.length === 0 && <div className="px-[18px] py-4 text-[15px] text-muted">Topics will appear here once they are added.</div>}
      </div>
    </>
  );
}
