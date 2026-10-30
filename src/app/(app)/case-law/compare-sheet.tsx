"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Comparison } from "@/lib/compare";

type State = { s: "loading" } | { s: "ready"; comparison: Comparison; cached: boolean } | { s: "error"; code: string };
type Save = { s: "idle" } | { s: "saving" } | { s: "saved" } | { s: "error"; code: string };

/** All the user is told about a failure: never the reason, only a code support can look up (src/lib/error-codes.ts). */
const errorText = (code: string) => `An error has occurred please try again later. Error code: ${code}`;
const codeOf = async (res: Response | null) => (res ? (((await res.json().catch(() => null)) as { code?: string } | null)?.code ?? `H${res.status}`) : "N001");

/**
 * The AI comparison of two case briefs, as a bottom sheet (a centred card on wide screens): a summary, the cases
 * side by side on facts, issue, ratio, holding and reasoning, what they share and where they differ, and which to cite.
 * The comparison is made on the server (src/lib/compare.ts); "Save to My Files" has the server file it as a Word document.
 */
export function CompareSheet({ a, b, onClose }: { a: string; b: string; onClose: () => void }) {
  const [state, setState] = useState<State>({ s: "loading" });
  const [save, setSave] = useState<Save>({ s: "idle" });
  const [attempt, setAttempt] = useState(0);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const ctl = new AbortController();
    (async () => {
      const res = await fetch("/api/case-law/compare", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ a, b }), signal: ctl.signal }).catch(() => null);
      if (ctl.signal.aborted) return;
      if (res?.ok) {
        const j = (await res.json().catch(() => null)) as { comparison: Comparison; cached: boolean } | null;
        if (j?.comparison) return setState({ s: "ready", comparison: j.comparison, cached: j.cached });
      }
      setState({ s: "error", code: await codeOf(res) });
    })();
    return () => ctl.abort();
  }, [a, b, attempt]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [onClose]);

  async function saveFile() {
    setSave({ s: "saving" });
    const res = await fetch("/api/case-law/compare/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ a, b }) }).catch(() => null);
    setSave(res?.ok ? { s: "saved" } : { s: "error", code: await codeOf(res) });
  }

  const c = state.s === "ready" ? state.comparison : null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label="Case comparison">
      <div onClick={onClose} className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" style={{ animation: "tt-fade 0.25s ease-out" }} />
      <div className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-canvas shadow-[0_-8px_40px_rgba(0,0,0,0.25)] md:max-w-[760px] md:rounded-[28px]" style={{ animation: "tt-sheet 0.38s cubic-bezier(0.32, 0.72, 0, 1)" }}>
        <div aria-hidden className="mx-auto mt-2 h-[5px] w-9 shrink-0 rounded-full bg-faint/40 md:hidden" />
        <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4 pb-2 pt-2.5">
          <span />
          <h2 className="m-0 text-[17px] font-semibold">Compare cases</h2>
          <button ref={close} type="button" onClick={onClose} className="justify-self-end border-0 bg-transparent text-[17px] font-semibold text-link">Done</button>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto overscroll-contain px-4 pb-5 pt-2">
          {state.s === "loading" && <Loading />}
          {state.s === "error" && (
            <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="m-0 max-w-[340px] text-[15px] text-muted">{errorText(state.code)}</p>
              <button type="button" onClick={() => { setState({ s: "loading" }); setAttempt((n) => n + 1); }} className="h-10 rounded-full border-0 bg-fill px-5 text-[15px] font-medium text-ink">Try again</button>
            </div>
          )}
          {c && (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                {c.cases.map((x, i) => (
                  <Link key={x.id} href={`/case-law/${x.slug}`} target="_blank" className="flex flex-col gap-0.5 rounded-[14px] bg-surface p-3.5 shadow-card" style={{ textDecoration: "none", color: "inherit" }}>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">Case {i === 0 ? "A" : "B"}</span>
                    <span className="text-[15px] font-semibold leading-snug">{x.title}</span>
                    <span className="text-xs text-muted">{[x.cite, x.court, x.jurisdiction].filter(Boolean).join(" · ")}</span>
                  </Link>
                ))}
              </div>

              <Section title="Summary"><p className="m-0 text-[15px] leading-[1.5]">{c.summary}</p></Section>

              <Section title="Side by side">
                <div className="flex flex-col gap-2.5">
                  {c.aspects.map((x) => (
                    <div key={x.label} className="rounded-[14px] bg-surface p-3.5 shadow-card">
                      <div className="mb-2 text-[13px] font-semibold">{x.label}</div>
                      <div className="grid gap-3 text-[14px] leading-[1.45] sm:grid-cols-2 sm:gap-4">
                        <p className="m-0"><b className="mb-0.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">Case A</b>{x.a}</p>
                        <p className="m-0"><b className="mb-0.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">Case B</b>{x.b}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="What they share"><Bullets items={c.similarities} /></Section>
              <Section title="Where they differ"><Bullets items={c.differences} /></Section>
              <Section title="Which to cite"><p className="m-0 text-[15px] leading-[1.5]">{c.takeaway}</p></Section>
              <p className="m-0 text-xs leading-snug text-muted">Made by AI from the two case briefs. It can make mistakes: check it against the full judgments before relying on it.</p>
            </>
          )}
        </div>

        {c && (
          <div className="shrink-0 border-t border-edge/[0.08] bg-canvas/90 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
            {save.s === "saved" ? (
              <div className="flex h-[50px] items-center justify-center gap-3 text-[15px]" role="status">
                <span className="font-semibold text-green">Saved to My Files</span>
                <Link href="/files" className="font-semibold text-link">View</Link>
              </div>
            ) : (
              <>
                {save.s === "error" && <p role="alert" className="m-0 mb-2 text-center text-xs text-red">{errorText(save.code)}</p>}
                <button type="button" onClick={saveFile} disabled={save.s === "saving"} className="h-[50px] w-full rounded-[14px] border-0 bg-blue text-[17px] font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-60">
                  {save.s === "saving" ? "Saving…" : "Save to My Files"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-2">
    <h3 className="m-0 text-[13px] font-semibold uppercase tracking-[0.04em] text-muted">{title}</h3>
    {children}
  </section>
);

const Bullets = ({ items }: { items: string[] }) => (
  <ul className="m-0 flex list-none flex-col gap-2 p-0">
    {items.map((t) => <li key={t} className="flex gap-2.5 text-[15px] leading-[1.45]"><span aria-hidden className="mt-[9px] size-[5px] shrink-0 rounded-full bg-faint" />{t}</li>)}
  </ul>
);

function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3 py-4">
      <p className="m-0 text-center text-[15px] text-muted">Comparing the two cases. This can take up to a minute.</p>
      {[88, 100, 72, 94].map((w, i) => <div key={i} className="h-16 animate-pulse rounded-[14px] bg-fill" style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }} />)}
    </div>
  );
}
