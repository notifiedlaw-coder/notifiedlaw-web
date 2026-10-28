"use client";

import { useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { usePlan } from "@/components/plan";
import { Btn, Gate } from "@/components/ui";
import { Markdown, splitChapters } from "@/components/markdown";

const SERIF = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";

/** A topic written in Notion (Markdown). Each "##" heading starts a chapter. */
export function Reader({ course, slug, n, title, maxOnly = false, body }: { course: string; slug: string; n: number; title: string; maxOnly?: boolean; body: string }) {
  const { max } = usePlan();
  const [cur, setCur] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  const chapters = useMemo(() => splitChapters(body, title), [body, title]);
  const total = chapters.length;
  const ch = chapters[cur];
  const minutes = Math.max(1, Math.round(body.split(/\s+/).length / 200));
  const last = cur === total - 1;
  const go = (i: number) => {
    setCur(i);
    scroller.current?.scrollTo({ top: 0 });
  };

  return (
    <div className="relative flex h-full">
      {maxOnly && !max && <Gate title="Pre-Bar and Bar Course come with Supreme Justice (Max)" body="Upgrade to read every note." cta="Unlock with Supreme Justice (Max)" color="#AF52DE" />}
      <div ref={scroller} className="min-w-0 flex-1 overflow-auto bg-surface">
        <article className="mx-auto max-w-[720px] px-5 py-8 md:px-8 md:py-10" style={{ fontFamily: SERIF, fontSize: 18, lineHeight: 1.65 }}>
          <div className="text-xs font-bold uppercase tracking-[0.05em] text-muted" style={{ fontFamily: "var(--font-sans)" }}>
            {course} · Topic {n}{total > 1 ? ` · Chapter ${cur + 1} of ${total}` : ""}
          </div>
          <h1 className="mb-2 mt-2.5 text-[28px] font-bold leading-tight tracking-[-0.01em] md:text-4xl">{title}</h1>
          <div className="mb-5 text-[13px] text-muted" style={{ fontFamily: "var(--font-sans)" }}>
            {total} {total === 1 ? "chapter" : "chapters"} · {minutes} min read
          </div>
          {total > 1 && (
            <div className="mb-6 flex flex-wrap gap-2" style={{ fontFamily: "var(--font-sans)" }}>
              {chapters.map((c, i) => (
                <button key={c.title + i} onClick={() => go(i)}
                  className="flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-left"
                  style={{ background: i === cur ? "#007AFF" : "var(--fill)", color: i === cur ? "#fff" : "var(--ink)" }}>
                  <span className="flex size-6 items-center justify-center rounded-full text-xs font-bold" style={{ background: i === cur ? "#fff" : "var(--surface)", color: i === cur ? "#1d1d1f" : "var(--muted)" }}>{i + 1}</span>
                  <span className="text-[13px] font-semibold">{c.title}</span>
                </button>
              ))}
            </div>
          )}
          {total > 1 && <h2 className="mb-2.5 mt-7 text-[26px] font-bold tracking-[-0.01em]">{ch.title}</h2>}
          <Markdown source={ch.md} />
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-edge/10 pt-5" style={{ fontFamily: "var(--font-sans)", fontSize: 14 }}>
            {cur > 0 ? <button onClick={() => go(cur - 1)} className="h-10 rounded-[10px] bg-fill px-4 text-[14px] font-semibold">Previous chapter</button> : <span />}
            {last ? <Btn href={`/library/${slug}`}>Back to course</Btn> : <button onClick={() => go(cur + 1)} className="flex h-10 items-center gap-1.5 rounded-[10px] bg-blue px-4 text-[14px] font-semibold text-white">Next chapter<Icon name="back" size={12} className="rotate-180" /></button>}
          </div>
        </article>
      </div>
    </div>
  );
}
