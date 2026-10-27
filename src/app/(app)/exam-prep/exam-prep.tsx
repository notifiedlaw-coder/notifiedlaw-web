"use client";

import { useState } from "react";
import { usePlan } from "@/components/plan";
import { Btn } from "@/components/ui";
import { PRACTICE_QUIZ } from "@/lib/content";

export function ExamPrep() {
  const { max } = usePlan();
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const q = PRACTICE_QUIZ[i % PRACTICE_QUIZ.length];
  const answered = pick != null;
  const ok = pick === q.a;

  return (
    <div className="mx-auto grid max-w-[1040px] gap-6 px-5 pb-12 pt-8 md:px-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs font-semibold text-muted">Constitutional Law II · Judicial Review</div>
            <h1 className="text-[28px] font-bold tracking-[-0.02em]">Practice questions</h1>
          </div>
          <div className="text-[13px] text-muted">Question {(i % PRACTICE_QUIZ.length) + 1} of {PRACTICE_QUIZ.length}</div>
        </div>
        <div className="flex flex-col gap-4 rounded-2xl bg-surface p-6 shadow-card">
          <div className="text-pretty text-[17px] font-semibold leading-snug">{q.q}</div>
          <div className="flex flex-col gap-2">
            {q.opts.map((o, oi) => {
              const sel = pick === oi, right = answered && oi === q.a, wrong = sel && !ok;
              return (
                <button key={o} onClick={() => !answered && setPick(oi)} className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm"
                  style={{ background: right ? "rgba(52,199,89,0.14)" : wrong ? "rgba(255,59,48,0.1)" : "var(--surface)", boxShadow: right ? "0 0 0 1.5px #34C759" : wrong ? "0 0 0 1.5px #FF3B30" : "0 0 0 0.5px var(--hairline)" }}>
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: right ? "#34C759" : wrong ? "#FF3B30" : "var(--fill)", color: right || wrong ? "#fff" : "var(--ink)" }}>{"ABCD"[oi]}</span>
                  {o}
                </button>
              );
            })}
          </div>
          {answered && (
            <div className="flex flex-col gap-2 rounded-xl px-4 py-3" style={{ background: ok ? "rgba(52,199,89,0.14)" : "rgba(255,59,48,0.1)" }}>
              <div className="text-sm font-semibold">{ok ? "Correct." : "Not quite."}</div>
              <div className="text-[13px] leading-normal">{q.why}</div>
              <div><Btn onClick={() => { setPick(null); setI((n) => n + 1); }}>Next question</Btn></div>
            </div>
          )}
        </div>
      </section>
      <aside className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 rounded-2xl bg-surface p-5 shadow-card">
          <div className="flex items-center gap-2 text-[15px] font-semibold">Essay practice {!max && <span className="rounded bg-indigo/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo">SUPREME JUSTICE</span>}</div>
          <div className="text-[13px] font-medium">Write an IRAC answer and get feedback</div>
          <p className="text-[13px] leading-normal text-muted">Notified AI checks which issues you spotted, the authorities you cited and how you structured your answer.</p>
          <div><Btn href={max ? "/ai" : "/plans"}>Start a problem question</Btn></div>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl bg-surface p-5 shadow-card">
          <div className="text-[15px] font-semibold">Timed mock exam</div>
          <p className="text-[13px] leading-normal text-muted">3 problem questions in 2 hours, in the format of your end-of-semester paper.</p>
          <div><Btn tone="plain">Schedule mock</Btn></div>
        </div>
      </aside>
    </div>
  );
}
