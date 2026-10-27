"use client";

import { usePlan } from "@/components/plan";
import { TopicRow } from "../library-view";

export function CourseTopics({ slug, topics, color }: { slug: string; topics: string[]; color: string }) {
  const { pro } = usePlan();
  return (
    <div className="overflow-hidden rounded-xl bg-surface shadow-card">
      {topics.map((t, i) => (
        <TopicRow key={t} slug={slug} i={i} title={t} color={color} locked={!pro && i >= 2} />
      ))}
    </div>
  );
}
