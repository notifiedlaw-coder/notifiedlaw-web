"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Chevron, Chip, Eyebrow, cardCls } from "@/components/ui";
import type { MockEpisode, RefKind } from "./mock";

const KIND_COLOR: Record<RefKind, string> = { Case: "var(--primary)", Act: "var(--color-green)", Article: "var(--color-amber)", Topic: "var(--color-plum)" };
const SPEEDS = [1, 1.25, 1.5, 2];
const link = { textDecoration: "none", color: "inherit" } as const;

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const mins = (s: number) => `${Math.round(s / 60)} min`;

/** The Hot Topics player: the episode playing, its chapters and the site materials it cites, then every episode. Playback is simulated. */
export function Podcast({ episodes }: { episodes: MockEpisode[] }) {
  const [current, setCurrent] = useState(episodes[0]);
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [area, setArea] = useState("All");

  // Advance the playhead while playing; stop at the end.
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setAt((a) => {
      const next = a + 0.25 * speed;
      if (next >= current.secs) { setPlaying(false); return current.secs; }
      return next;
    }), 250);
    return () => clearInterval(t);
  }, [playing, speed, current.secs]);

  const seek = (s: number) => setAt(Math.max(0, Math.min(current.secs, s)));
  const pick = (e: MockEpisode) => {
    if (e.n !== current.n) { setCurrent(e); setAt(0); }
    setPlaying(true);
    window.scrollTo({ top: 0 });
  };
  const chapter = current.chapters.findLastIndex(([s]) => s <= at);
  const areas = ["All", ...new Set(episodes.map((e) => e.area))];
  const shown = area === "All" ? episodes : episodes.filter((e) => e.area === area);

  return (
    <>
      <section aria-label="Now playing" className="relative flex flex-col gap-3.5 overflow-hidden rounded-[22px] bg-[#161A26] p-6 text-[#F6F5F2] md:gap-4 md:p-8">
        {/* Cover art: concentric sound rings in the corner. */}
        <svg aria-hidden viewBox="0 0 200 200" className="pointer-events-none absolute -right-16 -top-16 size-[260px] text-[#E0683A] opacity-60 md:-right-10 md:-top-10 md:size-[320px]">
          {[30, 52, 74, 96].map((r, i) => <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="currentColor" strokeWidth={i === 0 ? 10 : 2} opacity={1 - i * 0.2} />)}
        </svg>
        <Eyebrow color="#E0683A">Episode {current.n} · {current.area} · {current.date}</Eyebrow>
        <h2 className="relative text-balance m-0 max-w-[640px] text-[32px] leading-[1.06] md:text-[40px]">{current.title}</h2>
        <p className="relative m-0 max-w-[580px] text-[16px] leading-snug text-[#CFD3DE]">{current.blurb}</p>
        <div className="relative mt-2 flex flex-wrap items-center gap-3 md:flex-nowrap md:gap-4">
          <button type="button" onClick={() => seek(at - 15)} aria-label="Back 15 seconds" className="flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white/80 hover:bg-white/10">−15</button>
          <button type="button" onClick={() => { if (at >= current.secs) setAt(0); setPlaying(!playing); }} aria-label={playing ? "Pause" : "Play"} className="order-first flex h-[52px] shrink-0 items-center justify-center gap-2.5 rounded-full bg-[#E0683A] px-6 text-[16px] font-semibold text-white hover:bg-[#C4552B] active:scale-95 md:order-none">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              {playing ? <><rect x="3" y="2" width="3.5" height="12" rx="1" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" /></> : <path d="M4.5 2.6v10.8a.8.8 0 0 0 1.2.7l8.6-5.4a.8.8 0 0 0 0-1.4L5.7 1.9a.8.8 0 0 0-1.2.7z" />}
            </svg>
            <span aria-hidden>{playing ? "Pause" : at > 0 ? "Resume" : "Play"} · {mins(current.secs)}</span>
          </button>
          <button type="button" onClick={() => seek(at + 30)} aria-label="Forward 30 seconds" className="flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white/80 hover:bg-white/10">+30</button>
          <div className="flex min-w-0 flex-1 basis-full flex-col gap-1.5 md:basis-auto">
            <input type="range" min={0} max={current.secs} step={1} value={at} onChange={(e) => seek(Number(e.target.value))} aria-label="Seek"
              className="h-1 w-full cursor-pointer appearance-none rounded-full accent-amber-soft"
              style={{ background: `linear-gradient(90deg, var(--color-amber-soft) ${(at / current.secs) * 100}%, rgba(255,255,255,0.2) 0)` }} />
            <div className="flex justify-between text-xs tabular-nums text-white/60"><span>{clock(at)}</span><span>−{clock(current.secs - at)}</span></div>
          </div>
          <button type="button" onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])} aria-label="Playback speed" className="h-7 w-12 shrink-0 rounded-full bg-white/15 text-xs font-semibold tabular-nums hover:bg-white/25">{speed}×</button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <section className={`${cardCls} overflow-hidden`}>
          <div className="px-5 pb-2 pt-5"><Eyebrow>In this episode</Eyebrow></div>
          {current.chapters.map(([s, label], i) => (
            <button key={s} type="button" onClick={() => { seek(s); setPlaying(true); }} className="flex min-h-12 w-full items-baseline gap-3 border-t border-edge/[0.07] px-5 py-3 text-left hover:bg-hover">
              <span className={`w-11 shrink-0 text-[13px] tabular-nums ${i === chapter ? "font-semibold text-amber" : "text-faint"}`}>{clock(s)}</span>
              <span className={`text-[15px] leading-snug ${i === chapter ? "font-semibold" : ""}`}>{label}</span>
            </button>
          ))}
        </section>
        <section className={`${cardCls} overflow-hidden`}>
          <div className="px-5 pb-2 pt-5"><Eyebrow>From NotifiedLaw</Eyebrow></div>
          {current.refs.map((r) => (
            <Link key={r.title} href={r.href} className="flex min-h-14 items-center gap-3 border-t border-edge/[0.07] px-5 py-3 hover:bg-hover" style={link}>
              <span className="w-[60px] shrink-0 text-[11px] font-bold tracking-[0.08em]" style={{ color: KIND_COLOR[r.kind] }}>{r.kind.toUpperCase()}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-medium">{r.title}</span>
                <span className="truncate text-[13px] text-faint">{r.sub}</span>
              </span>
              <Chevron />
            </Link>
          ))}
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="m-0 text-[30px]">All episodes</h2>
          <span className="text-[14px] text-faint">New every Tuesday</span>
        </div>
        <div className="flex flex-wrap gap-2">{areas.map((a) => <Chip key={a} on={a === area} onClick={() => setArea(a)}>{a}</Chip>)}</div>
        <div className={`${cardCls} overflow-hidden`}>
          {shown.map((e) => {
            const now = e.n === current.n;
            return (
              <button key={e.n} type="button" onClick={() => pick(e)} aria-current={now || undefined} className="flex w-full items-center gap-4 border-t border-edge/[0.07] px-5 py-4 text-left first:border-0 hover:bg-hover">
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-full font-display text-[20px] ${now ? "bg-amber-soft text-white" : "bg-peach text-[var(--peach-fg)]"}`}>
                  {now && playing ? <Bars /> : e.n}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-display text-[21px] leading-[1.15]">{e.title}</span>
                  <span className="line-clamp-2 text-[15px] text-muted">{e.blurb}</span>
                  <span className="text-[13px] text-faint">{e.date} · {e.area} · {mins(e.secs)} · {e.refs.length} linked materials</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}

/** Three bouncing bars: the episode now playing. */
function Bars() {
  return (
    <span className="flex h-3.5 items-end gap-[2px]" aria-label="Playing">
      {[0, 0.2, 0.4].map((d) => <span key={d} className="w-[3px] rounded-full bg-white animate-[ht-bar_0.9s_ease-in-out_infinite]" style={{ animationDelay: `${d}s`, height: "100%", transformOrigin: "bottom" }} />)}
    </span>
  );
}
