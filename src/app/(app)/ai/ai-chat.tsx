"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { usePlan } from "@/components/plan";
import { Badge, Gate, Segmented } from "@/components/ui";
import { AI_HISTORY, type Treatment } from "@/lib/content";
import { AI_MESSAGE_COST, CREDIT_NAME } from "@/lib/data";

type Src = { n: number; title: string; sub: string; kind: Treatment; href?: string };
type Msg = { role: "user" | "ai"; text: string; sources?: Src[] };

const MODES = ["Learn", "Review", "Write"] as const;
const HINTS = { Learn: "Explain clearly, with sources.", Review: "Get feedback on your own answer. I won’t rewrite it.", Write: "Plan an IRAC outline. I won’t write the essay." };
const SUGG = ["Explain Article 2 vs Article 33", "Quiz me on judicial review", "Summarise Edusei v Attorney-General"];

const SEED: Msg[] = [
  { role: "user", text: "What’s the difference between an Article 2 action and an Article 33 action?" },
  {
    role: "ai",
    text: "Article 2(1) is for declaring that a law, act or omission is inconsistent with the Constitution [1]. It goes straight to the Supreme Court, and any person can bring it.\n\nArticle 33(1) is for enforcing your own fundamental human rights [2]. It starts in the High Court.\n\nIf the real complaint is a rights violation, the Supreme Court will usually decline jurisdiction, as in Edusei v Attorney-General [3].",
    sources: [
      { n: 1, title: "Constitution, 1992 · Article 2(1)", sub: "Enforcement of the Constitution", kind: "inforce" },
      { n: 2, title: "Constitution, 1992 · Article 33(1)", sub: "Protection of rights by the courts", kind: "inforce" },
      { n: 3, title: "Edusei v Attorney-General", sub: "[1996–97] SCGLR 1 · Supreme Court · ¶4", kind: "good", href: "/case-law/edusei-v-attorney-general" },
    ],
  },
];

const REPLY: Record<(typeof MODES)[number], Msg> = {
  Learn: { role: "ai", text: "Start with the governing provision, then apply it to the facts using IRAC: Issue, Rule, Application, Conclusion [1]. Want me to quiz you on the leading cases next?", sources: [{ n: 1, title: "Constitution, 1992 · Articles 2, 33 and 130", sub: "Constitution", kind: "inforce" }] },
  Review: { role: "ai", text: "Your issue spotting is good, but you treat this as an Article 2 action when the relief is really personal rights enforcement [1]. Address jurisdiction first, then cite Edusei v Attorney-General [2].", sources: [{ n: 1, title: "Constitution, 1992 · Articles 2, 33 and 130", sub: "Constitution", kind: "inforce" }, { n: 2, title: "Edusei v Attorney-General", sub: "[1996–97] SCGLR 1 · Supreme Court · ¶4", kind: "good", href: "/case-law/edusei-v-attorney-general" }] },
  Write: { role: "ai", text: "Outline: 1. Issue: which court has jurisdiction? 2. Rule: Articles 2, 33, 130 [1]. 3. Application: what relief does the plaintiff really want? 4. Conclusion.", sources: [{ n: 1, title: "Constitution, 1992 · Articles 2, 33 and 130", sub: "Constitution", kind: "inforce" }] },
};

export function AiChat() {
  const { credits, allowance, spend } = usePlan();
  const empty = credits < AI_MESSAGE_COST;
  const [mode, setMode] = useState<(typeof MODES)[number]>("Learn");
  const [msgs, setMsgs] = useState<Msg[]>(SEED);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);

  // Canned reply for now; swap for a Workers AI call from a route handler.
  const ask = (text: string) => {
    text = text.trim();
    if (!text || thinking || !spend(AI_MESSAGE_COST)) return;
    setDraft("");
    setThinking(true);
    setMsgs((m) => [...m, { role: "user", text }]);
    setTimeout(() => {
      setMsgs((m) => [...m, REPLY[mode]]);
      setThinking(false);
    }, 900);
  };

  return (
    <div className="relative flex h-[calc(100dvh-52px-64px)] md:h-[calc(100dvh-52px)]">
      <aside className="hidden w-[240px] shrink-0 flex-col gap-2 border-r border-edge/10 bg-panel p-3 lg:flex">
        <button onClick={() => setMsgs([])} className="h-8 rounded-[7px] bg-blue text-[13px] font-medium text-white">New chat</button>
        <div className="px-1 pt-2 text-[11px] font-semibold text-faint">History</div>
        {AI_HISTORY.map((h) => (
          <div key={h.title} className="flex flex-col rounded-lg px-2 py-1.5 hover:bg-edge/5">
            <span className="truncate text-[13px] font-medium">{h.title}</span>
            <span className="text-[11px] text-muted">{h.mode} · {h.when}</span>
          </div>
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-auto">
          <div className="mx-auto flex max-w-[720px] flex-col gap-4 px-5 py-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-indigo text-white"><Icon name="sparkle" size={16} /></span>
              <span className="text-lg font-bold">Notified AI</span>
              <Segmented options={MODES} value={mode} onChange={setMode} />
              <span className="text-xs text-muted">{HINTS[mode]}</span>
              {(allowance > 0 || credits > 0) && <span className="ml-auto rounded-full bg-fill px-2.5 py-1 text-xs font-semibold tabular-nums">{credits} {CREDIT_NAME}</span>}
            </div>
            {msgs.map((m, i) => (
              <div key={i} className={`flex flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-normal ${m.role === "user" ? "bg-blue text-white" : "bg-surface shadow-card"}`}>{m.text}</div>
                {m.sources && (
                  <div className="w-full max-w-[85%] overflow-hidden rounded-xl bg-surface shadow-[0_0_0_0.5px_var(--hairline)]">
                    {m.sources.map((s) => {
                      const row = (
                        <>
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-fill text-[11px] font-bold">{s.n}</span>
                          <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-[13px] font-medium">{s.title}</span><span className="truncate text-xs text-muted">{s.sub}</span></span>
                          <Badge kind={s.kind} />
                        </>
                      );
                      const cls = "flex items-center gap-2.5 border-t border-edge/[0.06] px-3 py-2 first:border-0";
                      return s.href ? <Link key={s.n} href={s.href} className={`${cls} hover:bg-hover`} style={{ textDecoration: "none", color: "inherit" }}>{row}</Link> : <div key={s.n} className={cls}>{row}</div>;
                    })}
                    <div className="flex gap-4 border-t border-edge/[0.06] px-3 py-2 text-xs text-blue"><span>Copy</span><span>Export to Word</span><Link href="/flashcards">Make flashcards</Link></div>
                  </div>
                )}
              </div>
            ))}
            {thinking && <div className="text-xs text-muted">Notified AI is checking the sources…</div>}
          </div>
        </div>
        <div className="border-t border-edge/[0.08] bg-surface/80 px-5 pb-4 pt-3">
          <div className="mx-auto flex max-w-[720px] flex-col gap-2">
            <div className="flex flex-wrap gap-2">{SUGG.map((s) => <button key={s} onClick={() => ask(s)} className="rounded-full bg-fill px-3 py-1 text-xs hover:bg-track">{s}</button>)}</div>
            <div className="flex items-center gap-2 rounded-2xl bg-surface p-2 pl-4 shadow-[0_0_0_0.5px_var(--hairline)]">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask(draft)} placeholder="Ask about any case, article or statute…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
              <button onClick={() => ask(draft)} aria-label="Send" className="flex size-8 items-center justify-center rounded-full bg-blue text-white"><Icon name="back" size={14} className="rotate-90" /></button>
            </div>
            <p className="text-[11px] text-muted">Always open the cited source before relying on it in an exam or assignment.</p>
          </div>
        </div>
      </div>
      {empty && allowance === 0 && <Gate title="A tutor that knows your syllabus" body={`Notified AI runs on ${CREDIT_NAME}. The free plan includes none. Upgrade for a monthly allowance, or buy a credit pack to try it.`} cta="See plans and credit packs" href="/plans#credits" color="#5856D6" />}
      {empty && allowance > 0 && <Gate title={`You’re out of ${CREDIT_NAME}`} body="Your monthly allowance resets next month. You can also buy extra credits that never expire." cta="Buy more credits" href="/plans#credits" color="#5856D6" />}
    </div>
  );
}
