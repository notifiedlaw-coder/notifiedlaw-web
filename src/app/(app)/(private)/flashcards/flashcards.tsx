"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePlan } from "@/components/plan";
import { LevelSelect } from "@/components/ui";
import { DEMO_USER, FLASHCARDS, LEVEL_LABEL, type Level } from "@/lib/data";

const GRADES = [
  ["Again", "< 1 min", "#FFF1F0"],
  ["Hard", "6 min", "#FFF6EB"],
  ["Good", "1 day", "#EEF9F1"],
  ["Easy", "4 days", "#EEF5FF"],
] as const;

export function Flashcards() {
  const { pro } = usePlan();
  const [level, setLevel] = useState<Level>(DEMO_USER.level);
  const [course, setCourse] = useState("All");
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [graded, setGraded] = useState<Record<number, string>>({});

  const courses = useMemo(() => ["All", ...new Set(FLASHCARDS[level].map((c) => c[2]))], [level]);
  const deck = useMemo(() => FLASHCARDS[level].filter((c) => course === "All" || c[2] === course), [level, course]);
  const finished = i >= deck.length;

  const go = (n: number) => {
    setFlipped(false);
    setI(Math.max(0, Math.min(deck.length, n)));
  };
  const reset = () => {
    setI(0);
    setFlipped(false);
    setGraded({});
  };
  const pickLevel = (l: Level) => {
    setLevel(l);
    setCourse("All");
    reset();
  };
  const pickCourse = (c: string) => {
    setCourse(c);
    reset();
  };
  const grade = (label: string) => {
    setGraded((g) => ({ ...g, [i]: label }));
    go(i + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Leave keys alone in form controls: arrows change the level picker, Space types in a field.
      if (e.target instanceof HTMLElement && e.target.closest("input, select, textarea, [contenteditable='true']")) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (!finished) setFlipped((f) => !f);
      } else if (e.code === "ArrowRight") go(i + 1);
      else if (e.code === "ArrowLeft") go(i - 1);
    };
    // Keyup too, so a focused button is not also "clicked" by Space.
    const onUp = (e: KeyboardEvent) => e.code === "Space" && !(e.target instanceof HTMLElement && e.target.closest("input, select, textarea")) && e.preventDefault();
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
    };
  });

  const card = deck[i];
  const nav = "h-9 rounded-lg bg-surface px-4 text-[13px] font-medium shadow-[0_0_0_0.5px_var(--hairline)] disabled:opacity-40";

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-5 px-5 pb-12 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-muted">{LEVEL_LABEL[level]}{course !== "All" ? ` · ${course}` : ""}</div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em]">Review session</h1>
        </div>
        <div className="text-[13px] text-muted">{finished ? "Done" : `Card ${i + 1} of ${deck.length}`}</div>
      </div>

      <div className="overflow-x-auto">
        <LevelSelect value={level} onChange={pickLevel} />
      </div>
      <div className="scroll-row flex flex-wrap gap-2">
        {courses.map((c) => (
          <button key={c} aria-pressed={c === course} onClick={() => pickCourse(c)}
            className={`h-[26px] rounded-full px-3 text-xs font-medium ${c === course ? "bg-strong text-strong-fg" : "bg-surface shadow-[0_0_0_0.5px_var(--hairline)]"}`}>
            {c === "All" ? "All courses" : c}
          </button>
        ))}
      </div>

      <div className="h-1 rounded-sm bg-track"><div className="h-full rounded-sm bg-purple transition-all" style={{ width: `${(Math.min(i, deck.length) / deck.length) * 100}%` }} /></div>

      {finished ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-[20px] bg-surface p-8 text-center shadow-card">
          <div className="text-[28px] font-bold">Session complete</div>
          <p className="text-sm text-muted">
            You went through {deck.length} cards{Object.keys(graded).length ? `, ${Object.values(graded).filter((g) => g === "Again" || g === "Hard").length} to revisit` : ""}.
          </p>
          <div className="flex gap-2">
            <button onClick={() => go(deck.length - 1)} className={nav}>Back to last card</button>
            <button onClick={reset} className="h-9 rounded-lg bg-blue px-4 text-[13px] font-medium text-white">Review again</button>
          </div>
        </div>
      ) : (
        <>
          <div role="button" tabIndex={0} aria-label={flipped ? "Show question" : "Reveal answer"} onClick={() => setFlipped((f) => !f)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setFlipped((f) => !f); } }}
            className="flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-4 rounded-[20px] bg-surface p-6 sm:min-h-[320px] sm:p-8 text-center shadow-card transition-shadow hover:shadow-card-hover">
            <div className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: flipped ? "#34C759" : "#AF52DE" }}>{flipped ? "Answer" : "Question"} · {card[2]}</div>
            <div aria-live="polite" className="text-pretty max-w-[560px] text-2xl font-semibold leading-snug tracking-[-0.01em]">{card[flipped ? 1 : 0]}</div>
            {!flipped && <div className="text-xs text-muted"><span className="sm:hidden">Tap to reveal</span><span className="hidden sm:inline">Click or press Space to reveal</span></div>}
          </div>
          {flipped && (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {GRADES.map(([l, t, bg]) => (
                <button key={l} onClick={() => grade(l)} aria-pressed={graded[i] === l}
                  // The pastel tints are light in both themes, so the text turns dark whenever one shows.
                  className="group flex flex-col items-center gap-0.5 rounded-xl bg-surface py-3 shadow-[0_0_0_0.5px_var(--hairline)] hover:bg-[var(--g)] hover:text-[#1d1d1f] aria-pressed:bg-[var(--g)] aria-pressed:text-[#1d1d1f]"
                  style={{ "--g": bg } as React.CSSProperties}>
                  <span className="text-sm font-semibold">{l}</span><span className="text-[11px] text-muted group-hover:text-[rgba(60,60,67,0.6)] group-aria-pressed:text-[rgba(60,60,67,0.6)]">{t}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div className="flex items-center justify-between">
        <button onClick={() => go(i - 1)} disabled={i === 0} className={nav}>← Previous</button>
        <span className="hidden text-xs text-muted sm:block">Use ← → to move, Space to flip</span>
        <button onClick={() => go(i + 1)} disabled={finished} className={nav}>{i === deck.length - 1 ? "Finish" : "Next →"}</button>
      </div>

      {!pro && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface px-4 py-3 text-[13px] shadow-card">
          <span className="flex-1">Attorney (Free) includes decks for starter topics. Senior Judicial (Pro) generates cards from every note you read.</span>
          <Link href="/plans">Compare plans</Link>
        </div>
      )}
    </div>
  );
}
