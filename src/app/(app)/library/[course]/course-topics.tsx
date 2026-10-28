"use client";

import { usePlan } from "@/components/plan";
import type { TopicInfo } from "@/lib/data";
import { TopicRow } from "../library-view";

export function CourseTopics({ slug, topics, maxOnly = false }: { slug: string; topics: TopicInfo[]; maxOnly?: boolean }) {
  const { pro, max } = usePlan();
  const gated = maxOnly && !max;
  return (
    <div className="overflow-hidden rounded-xl bg-surface shadow-card">
      {topics.map((t, i) => (
        <TopicRow key={t.title + i} slug={slug} i={i} topic={t} locked={gated || (!pro && i >= 2)} lockLabel={gated ? "Supreme Justice (Max)" : undefined} />
      ))}
      {topics.length === 0 && <div className="px-4 py-3.5 text-[13px] text-muted">Topics will appear here once they are added.</div>}
    </div>
  );
}
