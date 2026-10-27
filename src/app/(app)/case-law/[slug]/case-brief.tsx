"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { usePlan } from "@/components/plan";
import { Badge, Btn, Gate, Segmented } from "@/components/ui";
import { EDUSEI as C } from "@/lib/content";

const TABS = ["Summary", "Facts", "Holding", "Principles", "Judgment"] as const;
const SUGG = ["Why did the court decline jurisdiction?", "What is the ratio?"];
type Msg = { role: "ai" | "user"; text: string };

export function CaseBrief() {
  const { pro, max } = usePlan();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Summary");
  const [panel, setPanel] = useState<"Citator" | "Ask AI">("Citator");
  const [hl, setHl] = useState<number | null>(null);
  const [find, setFind] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "ai", text: "Ask me anything about Edusei v Attorney-General. I’ll answer from the judgment and point you to the paragraph." }]);
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  const jump = (n: number) => {
    setTab("Judgment");
    setHl(n);
    setTimeout(() => scroller.current?.querySelector(`[data-para="${n}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 80);
  };
  const ask = (t: string) => {
    if (!t.trim()) return;
    setDraft("");
    setMsgs((m) => [...m, { role: "user", text: t }, { role: "ai", text: "The court looked at the substance of the claim. Because it was really about enforcing the plaintiff’s own rights, the High Court under Article 33(1) was the proper forum. See ¶4 and ¶6." }]);
  };
  const head = "text-[11px] font-bold uppercase tracking-[0.05em] text-faint";

  return (
    <div className="relative flex h-[calc(100dvh-52px-64px)] md:h-[calc(100dvh-52px)]">
      <div ref={scroller} className="min-w-0 flex-1 overflow-auto">
        <div className="mx-auto flex max-w-[760px] flex-col gap-5 px-5 pb-12 pt-7 md:px-8">
          <div>
            <div className="text-xs font-semibold text-muted">Case brief · {C.court}</div>
            <h1 className="mt-1 text-[30px] font-bold leading-tight tracking-[-0.02em]">{C.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-muted">
              <span>{C.cite}</span>·<span>Decided {C.year}</span>·<button onClick={() => setPanel("Citator")} className="text-blue">Cited by {C.citedBy} later cases</button><Badge kind="good" />
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">{C.areas.map((a) => <span key={a} className="rounded-full bg-fill px-2.5 py-0.5 text-xs">{a}</span>)}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn href="/flashcards" tone="plain">Make flashcards from principles</Btn>
            <Btn tone="plain" onClick={() => setFind(find === null ? "" : null)}>Find in judgment</Btn>
            <Btn tone="plain">Download PDF</Btn>
            <Btn tone="plain" href="/files">Save to My Files</Btn>
          </div>
          {find !== null && (
            <div className="flex h-9 items-center gap-2 rounded-[10px] bg-surface px-3 shadow-[0_0_0_0.5px_var(--hairline)]">
              <Icon name="search" size={14} className="text-faint" />
              <input autoFocus value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a word or phrase in the judgment" className="flex-1 bg-transparent text-sm outline-none" />
              <span className="text-xs text-muted">{find ? `${C.paras.filter((p) => p.toLowerCase().includes(find.toLowerCase())).length} paragraphs` : ""}</span>
            </div>
          )}
          <Segmented options={TABS} value={tab} onChange={setTab} />
          {tab === "Summary" && (
            <div className="flex flex-col gap-4">
              <p className="text-[15px] leading-relaxed">{C.summary}</p>
              <div className="overflow-hidden rounded-xl bg-surface shadow-card">{C.glance.map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-t border-edge/[0.06] px-4 py-2.5 text-[13px] first:border-0"><span className="text-muted">{k}</span><span className="text-right font-medium">{v}</span></div>)}</div>
            </div>
          )}
          {tab === "Facts" && (
            <div className="flex flex-col gap-3">
              <div className={head}>Facts</div><p className="text-[15px] leading-relaxed">{C.facts}</p>
              <div className={head}>Issues</div>
              {C.issues.map((t, i) => <div key={t} className="flex gap-2.5 text-[15px]"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue text-xs font-bold text-white">{i + 1}</span>{t}</div>)}
            </div>
          )}
          {tab === "Holding" && (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl bg-green/10 p-4"><div className={head}>Holding</div><p className="mt-1 text-[15px] leading-relaxed">{C.holding}</p></div>
              <div className={head}>Reasoning</div>
              {C.reasoning.map((r) => <div key={r} className="flex gap-2.5 text-[15px]"><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-blue" />{r}</div>)}
              <div className={head}>Procedural history</div>
              <div className="overflow-hidden rounded-xl bg-surface shadow-card">{C.history.map(([y, t]) => <div key={y} className="flex gap-4 border-t border-edge/[0.06] px-4 py-2.5 text-[13px] first:border-0"><span className="w-10 font-semibold tabular-nums">{y}</span>{t}</div>)}</div>
            </div>
          )}
          {tab === "Principles" && (
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-muted">Each principle links to the paragraph of the judgment that supports it.</p>
              {C.principles.map((p, i) => (
                <div key={p.n} className="flex gap-3 rounded-xl bg-surface p-4 shadow-card">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-purple text-xs font-bold text-white">{i + 1}</span>
                  <div><div className="text-[15px] font-medium leading-snug">{p.t}</div><button onClick={() => jump(p.n)} className="mt-1 text-[13px] text-blue">See supporting passage · ¶{p.n}</button></div>
                </div>
              ))}
            </div>
          )}
          {tab === "Judgment" && (
            <div className="flex flex-col gap-1">
              {C.paras.map((p, i) => {
                const n = i + 1, match = !!find && p.toLowerCase().includes(find.toLowerCase());
                return (
                  <div key={n} data-para={n} className="flex gap-3 rounded-lg px-3 py-2 transition-colors" style={{ background: hl === n ? "rgba(255,204,0,0.3)" : match ? "rgba(0,122,255,0.08)" : "transparent" }}>
                    <span className="w-5 shrink-0 pt-0.5 text-xs tabular-nums text-faint">{n}</span>
                    <p className="text-[15px] leading-relaxed" style={{ fontFamily: "Georgia, serif" }}>{p}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <aside className="relative hidden w-[320px] shrink-0 flex-col border-l border-edge/10 bg-panel xl:flex">
        <div className="p-3.5"><Segmented options={["Citator", "Ask AI"] as const} value={panel} onChange={setPanel} /></div>
        {panel === "Citator" ? (
          <div className="relative flex flex-1 flex-col gap-3 overflow-auto px-4 pb-5">
            <div className="rounded-xl bg-surface p-3.5 shadow-card">
              <div className={head}>Most severe treatment</div>
              <div className="mt-1.5 flex items-center gap-2"><Badge kind="good" /><span className="text-xs text-muted">No negative treatment</span></div>
              <p className="mt-1.5 text-[13px] text-ink/80">Still good law. Later courts have not overruled or doubted it.</p>
            </div>
            <div className={head}>Cited by</div>
            {C.citing.map((c) => (
              <div key={c.title} className="flex flex-col gap-0.5 rounded-xl bg-surface p-3 shadow-card">
                <div className="flex items-start justify-between gap-2"><span className="text-[13px] font-semibold">{c.title}</span><Badge kind={c.kind} /></div>
                <span className="text-xs text-muted">{c.cite} · {c.court}</span><span className="text-xs">{c.note}</span>
              </div>
            ))}
            {!pro && <Gate title="Citator comes with Senior Judicial (Pro)" body="See how later courts treated this case before you cite it." cta="See plans" />}
          </div>
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="flex flex-1 flex-col gap-2 overflow-auto px-4 pb-3">
              {msgs.map((m, i) => <div key={i} className={`max-w-[90%] rounded-2xl px-3 py-2 text-[13px] leading-normal ${m.role === "user" ? "self-end bg-blue text-white" : "bg-fill"}`}>{m.text}</div>)}
              <div className="flex flex-wrap gap-1.5">{SUGG.map((s) => <button key={s} onClick={() => ask(s)} className="rounded-full bg-surface px-2.5 py-1 text-xs shadow-[0_0_0_0.5px_var(--hairline)]">{s}</button>)}</div>
            </div>
            <div className="border-t border-edge/[0.08] p-3">
              <div className="flex items-center gap-2 rounded-full bg-fill py-1 pl-3.5 pr-1">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask(draft)} placeholder="Ask about this case…" className="flex-1 bg-transparent text-[13px] outline-none" />
                <button onClick={() => ask(draft)} className="flex size-[26px] items-center justify-center rounded-full bg-blue text-white" aria-label="Send"><Icon name="back" size={12} className="rotate-90" /></button>
              </div>
            </div>
            {!max && <Gate title="Ask questions about any case" body="Notified AI answers from the judgment and points you to the paragraph." cta="Unlock with Supreme Justice (Max)" color="#5856D6" />}
          </div>
        )}
      </aside>
    </div>
  );
}
