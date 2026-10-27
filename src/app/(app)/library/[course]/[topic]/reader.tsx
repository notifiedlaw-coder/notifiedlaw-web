"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { usePlan } from "@/components/plan";
import { Watermark } from "@/components/watermark";
import { Btn, Gate, Segmented } from "@/components/ui";
import { CHAPTERS, PODCAST_CAPTIONS } from "@/lib/content";

const SERIF = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";
const SPEEDS = [1, 1.25, 1.5, 2];

export function Reader({ course, code, n, title }: { course: string; code: string; n: number; title: string }) {
  const { pro, max } = usePlan();
  const [cur, setCur] = useState(0);
  const [done, setDone] = useState(0);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<"Summary" | "Ask AI">("Summary");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0.34);
  const [speed, setSpeed] = useState(1);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setProgress((p) => (p >= 1 ? 0 : p + 0.002 * speed)), 250);
    return () => clearInterval(t);
  }, [playing, speed]);

  const total = CHAPTERS.length;
  const ch = CHAPTERS[cur];
  const right = ch.quiz.filter((q, qi) => picks[`${cur}-${qi}`] === q.a).length;
  const passed = right === ch.quiz.length || cur < done;
  const last = cur === total - 1;
  const go = (i: number) => {
    setCur(i);
    scroller.current?.scrollTo({ top: 0 });
  };
  const next = () => {
    if (!passed) return;
    if (!last) {
      setDone((d) => Math.max(d, cur + 1));
      go(cur + 1);
    } else setDone(total);
  };
  const elapsed = Math.floor(progress * 1104);
  const caption = PODCAST_CAPTIONS[Math.min(3, Math.floor(progress * 4))];

  return (
    <div className="relative flex h-[calc(100dvh-52px-64px)] md:h-[calc(100dvh-52px)]">
      <Watermark />
      <div className="flex min-w-0 flex-1 flex-col">
        <div ref={scroller} className="flex-1 overflow-auto bg-surface">
          <article className="mx-auto max-w-[720px] px-5 py-8 md:px-8 md:py-10" style={{ fontFamily: SERIF, fontSize: 18, lineHeight: 1.65 }}>
            <div className="text-xs font-bold uppercase tracking-[0.05em] text-muted" style={{ fontFamily: "var(--font-sans)" }}>
              {course} · Topic {n} · Chapter {cur + 1} of {total}
            </div>
            <h1 className="mb-2 mt-2.5 text-[28px] font-bold leading-tight tracking-[-0.01em] md:text-4xl">{title}</h1>
            <div className="mb-5 text-[13px] text-muted" style={{ fontFamily: "var(--font-sans)" }}>
              {total} chapters · 14 min read · Updated for the 2026/27 academic year
            </div>
            <div className="mb-6 flex flex-wrap gap-2" style={{ fontFamily: "var(--font-sans)" }}>
              {CHAPTERS.map((c, i) => {
                const isCur = i === cur, isDone = !isCur && i < done, locked = !isCur && i > Math.min(done, total - 1);
                return (
                  <button key={c.title} onClick={() => !locked && go(i)} disabled={locked}
                    className="flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-left"
                    style={{ background: isCur ? "#007AFF" : isDone ? "rgba(52,199,89,0.1)" : "var(--fill)", color: isCur ? "#fff" : "var(--ink)", opacity: locked ? 0.6 : 1, cursor: locked ? "not-allowed" : "pointer" }}>
                    <span className="flex size-6 items-center justify-center rounded-full text-xs font-bold" style={{ background: isCur ? "#fff" : isDone ? "#34C759" : "var(--surface)", color: isCur ? "var(--ink)" : isDone ? "#fff" : "rgba(60,60,67,0.6)" }}>
                      {isDone ? <Icon name="check" size={12} /> : locked ? <Icon name="lock" size={12} /> : i + 1}
                    </span>
                    <span className="flex flex-col"><span className="text-[11px] font-bold opacity-75">CHAPTER {i + 1}</span><span className="text-[13px] font-semibold">{c.title}</span></span>
                  </button>
                );
              })}
            </div>
            {cur === 0 && (
              <figure className="mb-2" style={{ fontFamily: "var(--font-sans)" }}>
                <div className="h-[260px] overflow-hidden rounded-[14px] bg-cover bg-center md:h-[340px]"
                  style={{ backgroundImage: "url(https://commons.wikimedia.org/wiki/Special:FilePath/Supreme_Court%2C_Accra_(IMG_20230201_140723_1).jpg?width=1600)", backgroundColor: "#1C1C1E" }} />
                <figcaption className="mt-2 text-xs text-muted">The Supreme Court of Ghana, Accra. It has exclusive original jurisdiction under Article 130.</figcaption>
              </figure>
            )}
            <h2 className="mb-2.5 mt-7 text-[26px] font-bold tracking-[-0.01em]">{ch.title}</h2>
            {ch.blocks.map((b, i) =>
              b.kind === "p" ? (
                <p key={i} className="mb-4">
                  {b.pre}
                  {b.hl && <span className="rounded-[3px] bg-[rgba(255,204,0,0.35)] px-0.5">{b.hl}</span>}
                  {b.post}
                </p>
              ) : (
                <div key={i} className="my-[22px] rounded-2xl bg-canvas px-5 py-[18px]" style={{ fontFamily: "var(--font-sans)" }}>
                  <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-faint">Leading case</div>
                  <div className="mt-1 text-base font-semibold italic">{b.name} <span className="font-normal not-italic text-muted">{b.cite}</span></div>
                  <div className="mt-1.5 text-sm leading-relaxed text-ink/85">{b.body}</div>
                </div>
              ),
            )}
            <div className="mt-8 flex flex-col gap-4 rounded-[18px] border border-edge/10 bg-panel p-5" style={{ fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.4 }}>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber/15 text-[#C93400]"><Icon name="check" size={18} /></div>
                <div className="flex-1 leading-tight">
                  <div className="text-xs font-bold uppercase tracking-[0.05em] text-blue">Chapter {cur + 1} check</div>
                  <div className="text-[19px] font-bold tracking-[-0.01em]">Get both right to unlock the next chapter</div>
                </div>
                <div className="rounded-full px-3 py-1 text-[13px] font-bold" style={{ background: passed ? "#34C759" : "var(--fill)", color: passed ? "#fff" : "var(--ink)" }}>{right} / {ch.quiz.length}</div>
              </div>
              {ch.quiz.map((q, qi) => {
                const key = `${cur}-${qi}`, pick = picks[key], answered = pick != null, ok = pick === q.a;
                return (
                  <div key={key} className="flex flex-col gap-2.5">
                    <div className="text-[15px] font-semibold">{qi + 1}. {q.q}</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {q.opts.map((o, oi) => {
                        const sel = pick === oi, isRight = sel && ok, isWrong = sel && !ok;
                        return (
                          <button key={o} onClick={() => !ok && setPicks((p) => ({ ...p, [key]: oi }))}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px]"
                            style={{ background: isRight ? "rgba(52,199,89,0.14)" : isWrong ? "rgba(255,59,48,0.1)" : "var(--surface)", boxShadow: isRight ? "0 0 0 1.5px #34C759" : isWrong ? "0 0 0 1.5px #FF3B30" : "0 0 0 0.5px var(--hairline)", opacity: ok && !sel ? 0.45 : 1 }}>
                            <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: isRight ? "#34C759" : isWrong ? "#FF3B30" : "var(--fill)", color: isRight || isWrong ? "#fff" : "var(--ink)" }}>{"ABCD"[oi]}</span>
                            {o}
                          </button>
                        );
                      })}
                    </div>
                    {answered && (
                      <div className="rounded-xl px-3.5 py-2.5 text-[13px] leading-normal" style={{ background: ok ? "rgba(52,199,89,0.14)" : "rgba(255,59,48,0.1)" }}>
                        <b>{ok ? "Correct." : "Not quite, try again."}</b> {q.why}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="flex items-center gap-3 border-t border-edge/10 pt-3.5">
                <div className="flex-1 text-[13px] text-ink/70">
                  {passed ? (last ? "Topic complete. Nice work." : `Chapter complete. Chapter ${cur + 2} is unlocked.`) : `Answer both questions correctly to unlock ${last ? "topic completion." : `Chapter ${cur + 2}.`}`}
                </div>
                {last && passed ? (
                  <Btn href="/library">Back to library</Btn>
                ) : (
                  <button onClick={next} disabled={!passed} className="flex h-9 items-center gap-1.5 rounded-[9px] px-4 text-[13px] font-semibold"
                    style={{ background: passed ? "#007AFF" : "var(--fill)", color: passed ? "#fff" : "rgba(60,60,67,0.55)", cursor: passed ? "pointer" : "not-allowed" }}>
                    {!passed && <Icon name="lock" size={13} />}
                    {last ? "Finish topic" : `Continue to Chapter ${cur + 2}`}
                  </button>
                )}
              </div>
            </div>
          </article>
        </div>

        <div className="relative flex shrink-0 items-center gap-3 border-t border-edge/10 bg-surface px-4 py-2.5">
          <div className="hidden size-11 shrink-0 rounded-[9px] bg-gradient-to-br from-amber to-[#C93400] sm:block" />
          <div className="hidden w-[210px] shrink-0 leading-tight lg:block">
            <div className="text-[13px] font-semibold">Who guards the Constitution?</div>
            <div className="text-xs text-muted">AI podcast · Akua &amp; Kwame</div>
          </div>
          <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-strong text-strong-fg">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">{playing ? <><rect x="3.5" y="2.5" width="3" height="11" rx="1" /><rect x="9.5" y="2.5" width="3" height="11" rx="1" /></> : <path d="M4.5 2.8v10.4a.6.6 0 0 0 .9.5l8.2-5.2a.6.6 0 0 0 0-1L5.4 2.3a.6.6 0 0 0-.9.5z" />}</svg>
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="truncate text-xs italic text-ink/80">{caption}</div>
            <div className="flex items-center gap-2.5 text-[11px] tabular-nums text-muted">
              <span>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span>
              <div className="h-1 flex-1 rounded-sm bg-track"><div className="h-full rounded-sm bg-amber" style={{ width: `${progress * 100}%` }} /></div>
              <span>18:24</span>
            </div>
          </div>
          <button onClick={() => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length])} className="h-7 rounded-md bg-fill px-2 text-xs font-semibold tabular-nums">{speed}×</button>
          {!max && <Link href="/plans" className="flex items-center gap-1 rounded-md bg-amber/15 px-2 py-1 text-[10px] font-bold text-[#C93400]" style={{ textDecoration: "none" }}><Icon name="lock" size={11} />SUPREME JUSTICE</Link>}
        </div>
      </div>

      <aside className="relative hidden w-[320px] shrink-0 flex-col border-l border-edge/10 bg-panel xl:flex">
        <div className="px-4 pb-3 pt-3.5"><Segmented options={["Summary", "Ask AI"] as const} value={tab} onChange={setTab} labels={{ Summary: "AI Summary" }} /></div>
        {tab === "Summary" ? (
          <div className="relative flex flex-1 flex-col gap-[18px] overflow-auto px-[18px] pb-5 pt-1">
            <div className="flex items-center gap-2"><Icon name="sparkle" size={14} className="text-purple" /><span className="text-[13px] font-semibold">60-second summary</span><span className="flex-1" /><span className="text-xs text-blue">Regenerate</span></div>
            <ul className="flex flex-col gap-3 text-[13px] leading-normal">
              {[["Art. 1(2)", " makes the Constitution supreme; inconsistent laws are void to that extent."], ["Art. 2(1)", " lets any person seek a declaration of inconsistency in the Supreme Court."], ["Art. 130(1)", " gives the Supreme Court exclusive original jurisdiction to interpret and enforce."], ["Art. 33(1)", " is where pure human-rights claims go: the High Court."]].map(([b, t]) => (
                <li key={b} className="flex gap-2.5"><span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-purple" /><span><b>{b}</b>{t}</span></li>
              ))}
            </ul>
            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-faint">Key cases</div>
              <div className="rounded-[10px] bg-surface text-[13px] shadow-[0_0_0_0.5px_var(--hairline)]">
                <div className="px-3 py-2.5"><i>Tuffuor v A-G</i> — supremacy &amp; sovereign will</div>
                <div className="border-t border-edge/[0.08] px-3 py-2.5"><i>NPP v A-G</i> — 31st December case</div>
                <Link href="/case-law/edusei-v-attorney-general" className="flex items-center gap-2 border-t border-edge/[0.08] px-3 py-2.5 hover:bg-hover" style={{ textDecoration: "none", color: "inherit" }}><span className="flex-1"><i>Edusei v A-G</i> — Art. 2 vs Art. 33</span><span className="text-xs text-blue">Brief</span></Link>
              </div>
            </div>
            <div className="rounded-[10px] bg-amber/10 px-3.5 py-3 text-[13px] leading-normal"><b className="text-[#C93400]">Exam tip</b><br />Problem questions often hide a human-rights claim inside an Art. 2 writ. Spot it, then argue jurisdiction first.</div>
            <div className="flex gap-2"><Btn href="/flashcards" tone="plain" className="flex-1">Make flashcards</Btn><Btn tone="plain" className="flex-1" onClick={() => setTab("Ask AI")}>Quiz me</Btn></div>
            {!pro && <Gate title="AI Summaries come with Senior Judicial (Pro)" body="Key provisions, leading cases and an exam tip for every topic." cta="Unlock with Senior Judicial (Pro)" color="#AF52DE" />}
          </div>
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-auto px-4 pb-3 text-[13px]"><div className="max-w-[260px] rounded-2xl bg-fill px-3.5 py-2.5 leading-normal">Ask me anything about this note. I’ll answer from Ghanaian law and point you to the source.</div></div>
            <div className="border-t border-edge/[0.08] px-3.5 pb-3.5 pt-2.5">
              <div className="flex items-center gap-2 rounded-full bg-fill py-1 pl-3.5 pr-1">
                <input placeholder="Ask about this note…" className="flex-1 bg-transparent text-[13px] outline-none" />
                <span className="flex size-[26px] items-center justify-center rounded-full bg-blue text-white"><Icon name="back" size={12} className="rotate-90" /></span>
              </div>
            </div>
            {!max && <Gate title="Your personal AI tutor" body="Ask questions about this note and get answers grounded in Ghanaian law." cta="Unlock with Supreme Justice (Max)" color="#5856D6" />}
          </div>
        )}
      </aside>
    </div>
  );
}
