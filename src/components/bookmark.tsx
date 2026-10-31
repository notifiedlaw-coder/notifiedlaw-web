"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * The case briefs a user has bookmarked, starting from what the server read. A change shows at once and is
 * undone, with `error` saying why, if it does not save. `marked` is null for a guest, who cannot keep any:
 * `toggle` then sends them to sign in.
 */
export function useBookmarks(initial: string[] | null) {
  const router = useRouter();
  const [marked, setMarked] = useState(() => (initial ? new Set(initial) : null));
  const [error, setError] = useState<string | null>(null);
  const flip = (id: string, on: boolean) => setMarked((m) => { const n = new Set(m); if (on) n.add(id); else n.delete(id); return n; });
  async function toggle(caseId: string) {
    if (!marked) { router.push("/login"); return; }
    const on = !marked.has(caseId);
    setError(null);
    flip(caseId, on);
    const res = await fetch("/api/bookmarks", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ caseId, on }) }).catch(() => null);
    if (res?.ok) return;
    flip(caseId, !on);
    setError(((await res?.json().catch(() => null)) as { error?: string } | null)?.error ?? "You're offline. Try again.");
  }
  return { marked, toggle, error };
}

/** A bookmark ribbon: an outline, filled blue once the case is bookmarked. */
export function BookmarkButton({ on, onClick, title, size = 18 }: { on: boolean; onClick: () => void; title: string; size?: number }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} aria-label={on ? `Remove bookmark: ${title}` : `Bookmark ${title}`}
      className={`flex size-9 shrink-0 items-center justify-center rounded-full border-0 bg-transparent hover:bg-fill ${on ? "text-blue" : "text-faint"}`}>
      <svg width={size} height={size} viewBox="0 0 16 16" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" aria-hidden>
        <path d="M4 2.5h8a.5.5 0 0 1 .5.5v10.5L8 10.5 3.5 13.5V3a.5.5 0 0 1 .5-.5z" />
      </svg>
    </button>
  );
}

/** The bookmark on a case brief's own page, as a "Save" pill. `saved` is null for a guest. */
export function CaseBookmark({ caseId, title, saved }: { caseId: string; title: string; saved: boolean | null }) {
  const marks = useBookmarks(saved === null ? null : saved ? [caseId] : []);
  const on = !!marks.marked?.has(caseId);
  return (
    <>
      <button type="button" onClick={() => marks.toggle(caseId)} aria-pressed={on} aria-label={on ? `Remove bookmark: ${title}` : `Save ${title}`}
        className={`flex h-11 items-center gap-2 rounded-full border px-5 text-[16px] font-semibold ${on ? "border-transparent bg-tint text-link" : "border-edge/15 bg-surface text-ink hover:bg-hover"}`}>
        <svg width={16} height={16} viewBox="0 0 16 16" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" aria-hidden>
          <path d="M4 2.5h8a.5.5 0 0 1 .5.5v10.5L8 10.5 3.5 13.5V3a.5.5 0 0 1 .5-.5z" />
        </svg>
        {on ? "Saved" : "Save"}
      </button>
      {marks.error && <span role="alert" className="text-[13px] text-red">{marks.error}</span>}
    </>
  );
}
