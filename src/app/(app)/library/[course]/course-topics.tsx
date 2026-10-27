"use client";

import { usePlan } from "@/components/plan";
import { TopicRow } from "../library-view";

export function CourseTopics({ slug, topics, color, maxOnly = false }: { slug: string; topics: string[]; color: string; maxOnly?: boolean }) {
  const { pro, max } = usePlan();
  const gated = maxOnly && !max;
  return (
    <div className="overflow-hidden rounded-xl bg-surface shadow-card">
      {topics.map((t, i) => (
        <TopicRow key={t} slug={slug} i={i} title={t} color={color} locked={gated || (!pro && i >= 2)} lockLabel={gated ? "Supreme Justice (Max)" : undefined} />
      ))}
    </div>
  );
}
