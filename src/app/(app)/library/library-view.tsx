"use client";

import Link from "next/link";
import { useState } from "react";
import { Btn, Chevron, LevelSelect, Page, Title } from "@/components/ui";
import { Icon } from "@/components/icons";
import { usePlan } from "@/components/plan";
import { abbr, COURSES, DEMO_USER, isMaxLevel, LEVEL_LABEL, TOTAL_TOPICS, type Level } from "@/lib/data";

export function TopicRow({ slug, i, title, color, locked, lockLabel = "Senior Judicial (Pro)" }: { slug: string; i: number; title: string; color: string; locked: boolean; lockLabel?: string }) {
  return (
    <Link
      href={locked ? "/plans" : `/library/${slug}/${i + 1}`}
      className="flex h-[52px] items-center gap-3.5 border-t border-edge/[0.06] px-4 first:border-0 hover:bg-hover"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <span className="w-[22px] text-[13px] tabular-nums text-ink/40">{i + 1}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium" style={{ opacity: locked ? 0.55 : 1 }}>{title}</span>
        <span className="text-xs text-faint">{8 + ((i * 3) % 7)} min read · 3 chapters</span>
      </span>
      {locked ? (
        <span className="flex items-center gap-1.5 text-xs text-faint"><Icon name="lock" size={12} />{lockLabel}</span>
      ) : i < 2 ? (
        <span className="rounded-[5px] bg-green/15 px-[7px] py-0.5 text-[11px] font-semibold text-[#248A3D]">FREE</span>
      ) : null}
      <Chevron />
    </Link>
  );
}

export function LibraryView() {
  const [level, setLevel] = useState<Level>(DEMO_USER.level);
  const { pro, max } = usePlan();
  const maxOnly = isMaxLevel(level) && !max;
  return (
    <Page>
      <Title
        title="Library"
        sub="LLB syllabus aligned to Ghanaian law faculties"
        right={<LevelSelect value={level} onChange={setLevel} />}
      />
      {!pro && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface px-4 py-3 shadow-card">
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
      {COURSES[level].map((c) => (
        <section key={c.slug} className="flex flex-col gap-2">
          <Link href={`/library/${c.slug}`} className="flex items-center gap-2.5 px-1" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="flex size-7 items-center justify-center rounded-lg text-[11px] font-bold text-white" style={{ background: c.color }}>{abbr(c.code)}</span>
            <span className="text-[17px] font-semibold">{c.title}</span>
            <span className="text-xs text-faint">{c.code}</span>
          </Link>
          <div className="overflow-hidden rounded-xl bg-surface shadow-card">
            {c.topics.map((t, i) => (
              <TopicRow key={t} slug={c.slug} i={i} title={t} color={c.color} locked={maxOnly || (!pro && i >= 2)} lockLabel={maxOnly ? "Supreme Justice (Max)" : undefined} />
            ))}
          </div>
        </section>
      ))}
    </Page>
  );
}
