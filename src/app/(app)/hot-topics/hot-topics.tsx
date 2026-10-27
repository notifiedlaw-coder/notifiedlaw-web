"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Chevron, Eyebrow, Page, Title, cardCls } from "@/components/ui";
import { EPISODES, PODCAST } from "@/lib/content";

const SPEEDS = [1, 1.25, 1.5, 2];
const KIND_COLOR = { Case: "#007AFF", Statute: "#34C759", Topic: "#AF52DE", Article: "#FF9F0A" } as const;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function HotTopics() {
  const [sel, setSel] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const ep = EPISODES[sel];
  const total = ep.mins * 60;

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setProgress((p) => Math.min(1, p + (0.25 * speed) / total)), 250);
    return () => clearInterval(t);
  }, [playing, speed, total]);
  useEffect(() => {
    if (progress >= 1) setPlaying(false);
  }, [progress]);

  const pick = (i: number) => {
    setSel(i);
    setProgress(0);
    setPlaying(true);
  };

  return (
    <Page max={1000}>
      <Title title="Hot Topics Podcast" sub={PODCAST.tagline} />

      <section className="relative overflow-hidden rounded-2xl bg-ink-dark p-6 text-white md:p-8">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: "url(https://commons.wikimedia.org/wiki/Special:FilePath/Supreme_Court%2C_Accra_(IMG_20230201_140723_1).jpg?width=1600)" }}
        />
        <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(28,28,30,0.95) 0%, rgba(28,28,30,0.75) 100%)" }} />
        <div className="relative flex flex-col gap-4">
          <Eyebrow color="#ff9f0a">Episode {ep.n} · {ep.area}</Eyebrow>
          <h2 className="text-balance max-w-[720px] text-[28px] font-bold leading-[1.1] tracking-[-0.02em] md:text-4xl">{ep.title}</h2>
          <p className="max-w-[640px] text-[15px] leading-snug text-white/75">{ep.blurb}</p>
          <div className="mt-1 flex items-center gap-3.5">
            <button
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause" : "Play"}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-[#1d1d1f]"
            >
              {playing ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="3.5" height="12" rx="1" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l9-5.5z" /></svg>
              )}
            </button>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <input
                type="range" min={0} max={1000} value={Math.round(progress * 1000)}
                onChange={(e) => setProgress(Number(e.target.value) / 1000)}
                aria-label="Seek" className="h-1 w-full accent-[#ff9f0a]"
              />
              <div className="flex justify-between text-xs tabular-nums text-white/60">
                <span>{mmss(Math.floor(progress * total))}</span>
                <span>{mmss(total)}</span>
              </div>
            </div>
            <button
              onClick={() => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length])}
              className="h-7 w-12 rounded-full bg-white/15 text-xs font-semibold tabular-nums"
              aria-label="Playback speed"
            >
              {speed}×
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className={`${cardCls} flex flex-col gap-3 p-5`}>
          <Eyebrow>In this episode</Eyebrow>
          <ul className="flex flex-col gap-2.5">
            {ep.talking.map((t) => (
              <li key={t} className="flex gap-2.5 text-sm leading-snug">
                <Icon name="headphones" size={14} className="mt-0.5 shrink-0 text-faint" />
                {t}
              </li>
            ))}
          </ul>
        </section>

        <section className={`${cardCls} overflow-hidden`}>
          <div className="px-5 pb-2 pt-5"><Eyebrow>From our website</Eyebrow></div>
          {ep.refs.map((r) => (
            <Link
              key={r.title}
              href={r.href}
              className="flex items-center gap-3 border-t border-edge/[0.06] px-5 py-3 hover:bg-hover"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <span className="w-14 shrink-0 text-[11px] font-bold uppercase tracking-[0.04em]" style={{ color: KIND_COLOR[r.kind] }}>{r.kind}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{r.title}</span>
                <span className="truncate text-xs text-muted">{r.sub}</span>
              </span>
              <Chevron />
            </Link>
          ))}
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">All episodes</h2>
        <div className={`${cardCls} overflow-hidden`}>
          {EPISODES.map((e, i) => (
            <button
              key={e.n}
              onClick={() => pick(i)}
              className={`flex w-full items-center gap-3.5 border-t border-edge/[0.06] px-4 py-3 text-left first:border-0 hover:bg-hover ${i === sel ? "bg-hover" : ""}`}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold" style={{ background: i === sel ? "#ff9f0a" : "var(--fill)", color: i === sel ? "#fff" : "var(--ink)" }}>
                {e.n}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{e.title}</span>
                <span className="truncate text-xs text-muted">{e.date} · {e.mins} min · {e.area}</span>
              </span>
              <Chevron />
            </button>
          ))}
        </div>
      </section>
    </Page>
  );
}
