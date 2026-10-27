"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { usePlan } from "@/components/plan";
import { Badge, Btn, Gate, Segmented } from "@/components/ui";
import { ACT29 } from "@/lib/content";

const SUGG = ["What is the penalty for murder?", "What changed in 2023?"];
type Msg = { role: "ai" | "user"; text: string };

export function Statute() {
  const { max } = usePlan();
  const [ver, setVer] = useState<"Current" | "As enacted (1960)">("Current");
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "ai", text: "Ask about any section of the Criminal Offences Act. I’ll use the current version unless you ask about the original." }]);
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const cur = ver === "Current";
  const ask = (t: string) => {
    if (!t.trim()) return;
    setDraft("");
    setMsgs((m) => [...m, { role: "user", text: t }, { role: "ai", text: "Since the 2023 amendment, section 46 provides for life imprisonment for murder. The 1960 text provided for death." }]);
  };

  return (
    <div className="relative flex h-[calc(100dvh-52px-64px)] md:h-[calc(100dvh-52px)]">
      <nav className="hidden w-[220px] shrink-0 flex-col gap-0.5 overflow-auto border-r border-edge/10 bg-panel p-3 lg:flex">
        <div className="px-2 pb-1 text-[11px] font-semibold text-faint">Jump to section</div>
        {ACT29.map((s) => (
          <button key={s.num} onClick={() => scroller.current?.querySelector(`[data-sec="${s.num}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" })} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-edge/5">
            <span className="text-xs tabular-nums text-faint">s.{s.num}</span><span className="flex-1 truncate">{s.title}</span>{s.cur && <span title="Amended" className="size-1.5 rounded-full bg-amber" />}
          </button>
        ))}
      </nav>
      <div ref={scroller} className="min-w-0 flex-1 overflow-auto">
        <div className="mx-auto flex max-w-[720px] flex-col gap-5 px-5 pb-12 pt-7 md:px-8">
          <div>
            <div className="text-xs font-semibold text-muted">Act of Parliament · Act 29</div>
            <h1 className="mt-1 text-[30px] font-bold leading-tight tracking-[-0.02em]">Criminal Offences Act, 1960</h1>
            <div className="mt-2 flex items-center gap-2 text-[13px] text-muted"><span>Act 29 · 1960</span><Badge kind="amended" /></div>
          </div>
          {cur ? (
            <div className="flex gap-2.5 rounded-xl bg-amber/10 px-4 py-3 text-[13px] leading-normal"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-amber" /><div><b>Amended.</b> The Criminal Offences (Amendment) Act, 2023 replaced the death penalty for murder with life imprisonment. You’re reading the current version.</div></div>
          ) : (
            <div className="rounded-xl bg-fill px-4 py-3 text-[13px]">You’re reading the Act as enacted in 1960. Some sections have since been amended. <button className="text-blue" onClick={() => setVer("Current")}>Back to current version</button></div>
          )}
          <div className="flex items-center gap-3"><Segmented options={["Current", "As enacted (1960)"] as const} value={ver} onChange={setVer} /><span className="flex-1" /><Btn tone="plain">Download PDF</Btn></div>
          {ACT29.map((s) => (
            <div key={s.num} data-sec={s.num} className="flex flex-col gap-1.5 rounded-xl bg-surface p-4 shadow-card">
              <div className="flex items-center gap-2"><span className="text-xs font-bold text-faint">Section {s.num}</span><span className="flex-1 text-sm font-semibold">{s.title}</span>{cur && s.cur && <Badge kind="amended" label="Amended 2023" />}</div>
              <p className="text-[15px] leading-relaxed" style={{ fontFamily: "Georgia, serif" }}>{cur && s.cur ? s.cur : s.orig}</p>
              {cur && s.note && <div className="rounded-lg bg-amber/10 px-3 py-2 text-xs">{s.note}</div>}
            </div>
          ))}
        </div>
      </div>
      <aside className="relative hidden w-[300px] shrink-0 flex-col border-l border-edge/10 bg-panel xl:flex">
        <div className="flex items-center gap-2 px-4 py-3.5"><Icon name="sparkle" size={14} className="text-indigo" /><span className="text-[13px] font-semibold">Ask this Act</span></div>
        <div className="flex flex-1 flex-col gap-2 overflow-auto px-4 pb-3">
          {msgs.map((m, i) => <div key={i} className={`max-w-[90%] rounded-2xl px-3 py-2 text-[13px] leading-normal ${m.role === "user" ? "self-end bg-blue text-white" : "bg-fill"}`}>{m.text}</div>)}
          <div className="flex flex-wrap gap-1.5">{SUGG.map((s) => <button key={s} onClick={() => ask(s)} className="rounded-full bg-surface px-2.5 py-1 text-xs shadow-[0_0_0_0.5px_var(--hairline)]">{s}</button>)}</div>
        </div>
        <div className="border-t border-edge/[0.08] p-3">
          <div className="flex items-center gap-2 rounded-full bg-fill py-1 pl-3.5 pr-1">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask(draft)} placeholder="Ask about any section…" className="flex-1 bg-transparent text-[13px] outline-none" />
            <button onClick={() => ask(draft)} className="flex size-[26px] items-center justify-center rounded-full bg-blue text-white" aria-label="Send"><Icon name="back" size={12} className="rotate-90" /></button>
          </div>
        </div>
        {!max && <Gate title="Ask questions about any Act" body="Get plain-English answers about offences, penalties and what changed." cta="Unlock with Supreme Justice (Max)" color="#5856D6" />}
      </aside>
    </div>
  );
}
