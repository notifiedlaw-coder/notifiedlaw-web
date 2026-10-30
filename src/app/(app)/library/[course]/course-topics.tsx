"use client";

import Link from "next/link";
import { useState } from "react";
import { Segmented } from "@/components/ui";
import { usePlan } from "@/components/plan";
import { ProgressBar, useProgress } from "@/components/progress";
import { PREVIEW_TOPICS, type TopicInfo } from "@/lib/data";
import { TopicRow } from "../library-view";

const FILTERS = ["All", "To study", "Studied"] as const;
type Filter = (typeof FILTERS)[number];

/**
 * A course's topics. A signed-in reader also sees how many they have studied, the next topic to read, and can
 * narrow the list to the topics still to study or those done. `completed` is null for a guest.
 */
export function CourseTopics({ slug, topics, completed, maxOnly = false }: { slug: string; topics: TopicInfo[]; completed: string[] | null; maxOnly?: boolean }) {
  const { paid, max } = usePlan();
  const gated = maxOnly && !max;
  const progress = useProgress(completed);
  const [filter, setFilter] = useState<Filter>("All");
  const done = progress.done;
  const locked = (i: number) => gated || (!paid && i >= PREVIEW_TOPICS);
  const ready = topics.filter((t) => t.ready);
  const studied = done ? ready.filter((t) => done.has(t.id)).length : 0;
  const nextAt = done ? topics.findIndex((t, i) => t.ready && !locked(i) && !done.has(t.id)) : -1;
  const shown = topics.map((t, i) => ({ t, i })).filter(({ t }) => !done || filter === "All" || (t.ready && done.has(t.id) === (filter === "Studied")));

  return (
    <>
      {done && ready.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl bg-surface px-4 py-3.5 shadow-card">
          <ProgressBar done={studied} total={ready.length} />
          {nextAt >= 0 ? (
            <Link href={`/library/${slug}/${nextAt + 1}`} className="flex items-center gap-3 rounded-[10px] bg-fill px-3 py-2.5 hover:bg-track/70" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{studied ? "Up next" : "Start with"}</span>
                <span className="truncate text-[14px] font-semibold">{nextAt + 1}. {topics[nextAt].title}</span>
              </span>
              <span className="shrink-0 rounded-full bg-blue px-3.5 py-1.5 text-[13px] font-semibold text-white">{studied ? "Continue" : "Start"}</span>
            </Link>
          ) : studied === ready.length ? (
            <p className="m-0 text-[13px] font-semibold text-[#248A3D]">Every available topic studied.</p>
          ) : null}
          {progress.error && <p role="alert" className="m-0 text-[13px] text-red">{progress.error}</p>}
        </div>
      )}
      {done && studied > 0 && <div className="max-w-[300px]"><Segmented options={FILTERS} value={filter} onChange={setFilter} /></div>}
      <div className="overflow-hidden rounded-xl bg-surface shadow-card">
        {shown.map(({ t, i }) => (
          <TopicRow key={t.title + i} slug={slug} i={i} topic={t} locked={locked(i)} preview={!paid} lockLabel={gated ? "Supreme Justice (Max)" : undefined}
            done={done?.has(t.id)} onToggle={done ? (on) => progress.toggle(t.id, on) : undefined} />
        ))}
        {topics.length === 0 && <div className="px-4 py-3.5 text-[13px] text-muted">Topics will appear here once they are added.</div>}
        {topics.length > 0 && shown.length === 0 && <div className="px-4 py-3.5 text-[13px] text-muted">{filter === "Studied" ? "No topics studied yet." : "Nothing left to study here."}</div>}
      </div>
    </>
  );
}
