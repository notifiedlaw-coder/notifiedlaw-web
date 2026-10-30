"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";

/**
 * The topics a student has marked as studied, starting from what the server read. A change shows at once and is
 * undone, with `error` saying why, if it does not save. `done` is null for a guest, who cannot track progress.
 */
export function useProgress(initial: string[] | null) {
  const [done, setDone] = useState(() => (initial ? new Set(initial) : null));
  const [error, setError] = useState<string | null>(null);
  const flip = (id: string, on: boolean) => setDone((d) => { const n = new Set(d); if (on) n.add(id); else n.delete(id); return n; });
  async function toggle(topicId: string, on: boolean) {
    setError(null);
    flip(topicId, on);
    const res = await fetch("/api/progress", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ topicId, done: on }) }).catch(() => null);
    if (res?.ok) return true;
    flip(topicId, !on);
    setError(((await res?.json().catch(() => null)) as { error?: string } | null)?.error ?? "You're offline. Try again.");
    return false;
  }
  return { done, toggle, error };
}

/** A round check, as in Reminders: an empty ring, filled green with a tick once the topic is studied. */
export function CheckCircle({ on, size = 22 }: { on: boolean; size?: number }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${on ? "bg-green text-white" : "border-[1.5px] border-faint/70"}`} style={{ width: size, height: size }} aria-hidden>
      {on && <Icon name="tick" size={Math.round(size * 0.6)} />}
    </span>
  );
}

/** A course's progress as a thin bar with "3 of 12 studied". */
export function ProgressBar({ done, total, color = "var(--color-green)" }: { done: number; total: number; color?: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-track" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Topics studied">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="shrink-0 text-[12px] tabular-nums text-muted">{done} of {total} studied</span>
    </div>
  );
}
