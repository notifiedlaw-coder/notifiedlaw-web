"use client";

import { useState } from "react";
import { Sheet } from "./sheet";

const REASONS = ["Harassment or bullying", "Hate speech", "Sexual content", "Spam or scams", "Threats or violence", "Something else"];
export type ReportTarget = { kind: "user" | "group" | "message" | "group_message"; target: string; what: string };

/** Asks why something is being reported and sends it for review. */
export function ReportSheet({ item, onClose }: { item: ReportTarget; onClose: () => void }) {
  const [reason, setReason] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  async function send() {
    if (!reason) return;
    setState("sending");
    setError("");
    try {
      const r = await fetch("/api/reports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: item.kind, target: item.target, reason }) });
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(d.error ?? "The report was not sent. Try again.");
      setState("sent");
    } catch (e) {
      setState("idle");
      setError(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "You seem to be offline. Try again.");
    }
  }
  return (
    <Sheet label={`Report ${item.what}`} onClose={onClose}>
      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4 pb-2 pt-2.5">
        <button type="button" onClick={onClose} className="justify-self-start border-0 bg-transparent text-[17px] text-link">{state === "sent" ? "" : "Cancel"}</button>
        <h2 className="m-0 text-[17px] font-semibold">Report {item.what}</h2>
        {state === "sent" ? <button type="button" onClick={onClose} className="justify-self-end border-0 bg-transparent text-[17px] font-semibold text-link">Done</button> : <span />}
      </div>
      {state === "sent" ? (
        <p className="m-0 px-6 pb-10 pt-6 text-center text-[15px] text-muted">Thank you. We will review it. If you feel unsafe, you can also block them.</p>
      ) : (
        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
          <p className="m-0 px-1 text-[13px] text-muted">What is wrong with this {item.what}? Reports are private; they are not told who sent one.</p>
          <div role="radiogroup" aria-label="Reason" className="flex flex-col overflow-hidden rounded-[16px] bg-surface shadow-card">
            {REASONS.map((r) => (
              <button key={r} type="button" role="radio" aria-checked={reason === r} onClick={() => setReason(r)}
                className="flex min-h-11 items-center justify-between border-0 border-t border-edge/[0.06] bg-transparent px-4 text-left text-[16px] text-ink first:border-t-0">
                {r}{reason === r && <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--color-blue)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m3 8.5 3.2 3.2L13 4.5" /></svg>}
              </button>
            ))}
          </div>
          {error && <p role="alert" className="m-0 px-1 text-[13px] text-red">{error}</p>}
          <button type="button" disabled={!reason || state === "sending"} onClick={send} className="h-[50px] rounded-[14px] border-0 bg-red text-[17px] font-semibold text-white disabled:opacity-40">{state === "sending" ? "Sending" : "Send report"}</button>
        </div>
      )}
    </Sheet>
  );
}
