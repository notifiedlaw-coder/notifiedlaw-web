"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import type { TopicNote } from "@/lib/notes";

const SANS = { fontFamily: "var(--font-sans)" };
const SERIF = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";
const MAX_NOTE = 2000;
const BEFORE = 60;

export type Draft = { chapter: number; quote: string; before: string; range: Range };
type Status = "loading" | "ready" | "signedOut" | "error";

// ---------------------------------------------------------------- finding passages in the text

/** Elements that start a new line, so the text on either side of them is kept apart by a space. */
const BLOCKS = "p,li,h1,h2,h3,h4,h5,h6,blockquote,pre,td,th,tr,div";

/**
 * The text under `root` with each run of whitespace (and each break between blocks) as one space, plus the text
 * node and offset every character came from. Quotes are saved in this form, so they can be found again.
 */
export function textMap(root: Node) {
  let text = "";
  const at: [Text, number][] = [];
  let space = true;
  let block: Element | null = null;
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode() as Text | null; n; n = walk.nextNode() as Text | null) {
    const b = n.parentElement?.closest(BLOCKS) ?? null;
    if (b !== block && !space && n.data.length) { text += " "; at.push([n, 0]); space = true; }
    block = b;
    for (let i = 0; i < n.data.length; i++) {
      if (/\s/.test(n.data[i])) { if (!space) { text += " "; at.push([n, i]); space = true; } }
      else { text += n.data[i]; at.push([n, i]); space = false; }
    }
  }
  return { text, at };
}

type Map = ReturnType<typeof textMap>;

const rangeOf = (m: Map, s: number, e: number) => {
  const r = document.createRange();
  r.setStart(m.at[s][0], m.at[s][1]);
  r.setEnd(m.at[e][0], m.at[e][1] + 1);
  return r;
};

/** The selected passage as it is saved: the quote, the text just before it, and its range. Null if empty. */
export function passageOf(m: Map, sel: Range): { quote: string; before: string; range: Range } | null {
  let s = -1;
  let e = -1;
  for (let i = 0; i < m.at.length; i++) {
    const [node, off] = m.at[i];
    // A character is in the selection when both its edges are.
    if (sel.comparePoint(node, off) === 0 && sel.comparePoint(node, off + 1) === 0) {
      if (s < 0) s = i;
      e = i;
    }
  }
  while (s >= 0 && s <= e && m.text[s] === " ") s++;
  while (e >= s && m.text[e] === " ") e--;
  if (s < 0 || e < s) return null;
  return { quote: m.text.slice(s, e + 1), before: m.text.slice(Math.max(0, s - BEFORE), s).trim(), range: rangeOf(m, s, e) };
}

/** Where a saved note's passage is in the text now: the occurrence with the same text before it, else the first. */
export function findPassage(m: Map, quote: string, before: string): Range | null {
  let first = -1;
  for (let i = m.text.indexOf(quote); i >= 0; i = m.text.indexOf(quote, i + 1)) {
    if (first < 0) first = i;
    if (!before || m.text.slice(Math.max(0, i - BEFORE - 2), i).trim().endsWith(before)) return rangeOf(m, i, i + quote.length - 1);
  }
  return first < 0 ? null : rangeOf(m, first, first + quote.length - 1);
}

/** Paints passages with the CSS Custom Highlight API, which leaves the text's DOM alone. No-op where unsupported. */
export function paint(name: string, ranges: Range[]) {
  if (typeof CSS === "undefined" || !("highlights" in CSS)) return;
  if (ranges.length) CSS.highlights.set(name, new Highlight(...ranges));
  else CSS.highlights.delete(name);
}

// ---------------------------------------------------------------- loading and saving

/** The signed-in reader's notes on a topic, and the calls that change them. Each returns an error, or null. */
export function useTopicNotes(topicId: string | null) {
  const [notes, setNotes] = useState<TopicNote[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  useEffect(() => {
    if (!topicId) return;
    let live = true;
    fetch(`/api/notes?topic=${topicId}`).then(async (r) => {
      if (!live) return;
      if (r.status === 401) return setStatus("signedOut");
      const j = (await r.json().catch(() => null)) as { notes?: TopicNote[] } | null;
      if (!r.ok || !j?.notes) return setStatus("error");
      setNotes(j.notes);
      setStatus("ready");
    }).catch(() => live && setStatus("error"));
    return () => { live = false; };
  }, [topicId]);

  const call = async (url: string, method: string, body?: unknown) => {
    const r = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
    if (!r) return { error: "Could not reach NotifiedLaw. Check your connection and try again." };
    if (r.status === 204) return {};
    const j = (await r.json().catch(() => null)) as { error?: string; note?: TopicNote } | null;
    return r.ok && j ? j : { error: j?.error ?? "Something went wrong. Try again." };
  };
  const order = (a: TopicNote, b: TopicNote) => a.chapter - b.chapter || a.createdAt - b.createdAt;

  return {
    notes, status,
    add: async (d: Omit<Draft, "range">, note: string) => {
      const j = await call("/api/notes", "POST", { topicId, ...d, note });
      if (j.note) setNotes((ns) => [...ns, j.note!].sort(order));
      return j.error ?? null;
    },
    edit: async (id: string, note: string) => {
      const j = await call(`/api/notes/${id}`, "PATCH", { note });
      if (j.note) setNotes((ns) => ns.map((n) => (n.id === id ? j.note! : n)));
      return j.error ?? null;
    },
    remove: async (id: string) => {
      const j = await call(`/api/notes/${id}`, "DELETE");
      if (!j.error) setNotes((ns) => ns.filter((n) => n.id !== id));
      return j.error ?? null;
    },
  };
}

// ---------------------------------------------------------------- UI

/** The pill that appears over a selection in the text. Pressing it does not clear the selection. */
export function AddNoteButton({ rect, onAdd }: { rect: DOMRect; onAdd: () => void }) {
  const coarse = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
  // Below the selection on touch screens, where the system's own menu sits above it.
  const below = coarse || rect.top < 70;
  const x = Math.min(Math.max(rect.left + rect.width / 2, 70), innerWidth - 70);
  return (
    <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={onAdd}
      className="fixed z-40 flex h-9 -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[13px] font-semibold text-surface shadow-[0_6px_20px_rgba(0,0,0,0.25)] animate-[tt-pop_140ms_ease-out]"
      style={{ ...SANS, left: x, top: below ? rect.bottom + 10 : rect.top - 46 }}>
      <Icon name="note" size={14} />Add note
    </button>
  );
}

const Quote = ({ text, clamp = true }: { text: string; clamp?: boolean }) => (
  <blockquote className={`m-0 border-l-[3px] border-[#FFCC00] pl-2.5 text-[13px] italic leading-snug text-muted ${clamp ? "line-clamp-3" : "line-clamp-6"}`} style={{ fontFamily: SERIF }}>
    {text}
  </blockquote>
);

function NoteField({ initial = "", busy, error, label, onSave, onCancel }: { initial?: string; busy: boolean; error: string | null; label: string; onSave: (t: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(initial);
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const t = box.current;
    if (!t) return;
    t.focus({ preventScroll: true });
    t.setSelectionRange(t.value.length, t.value.length);
  }, []);
  // Grows with the note, up to a point.
  useEffect(() => {
    const t = box.current;
    if (t) { t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 220)}px`; }
  }, [text]);
  const ok = text.trim().length > 0 && !busy;
  return (
    <div className="flex flex-col gap-2">
      <textarea ref={box} value={text} onChange={(e) => setText(e.target.value)} maxLength={MAX_NOTE} rows={3} aria-label={label} placeholder="Write your note…"
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.preventDefault(); onCancel(); }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && ok) { e.preventDefault(); onSave(text); }
        }}
        className="min-h-[76px] w-full resize-none rounded-[10px] bg-surface px-3 py-2 text-[14px] leading-snug text-ink shadow-[0_0_0_0.5px_var(--hairline)] outline-none placeholder:text-faint focus-visible:ring-2 focus-visible:ring-blue/40" />
      {error && <p role="alert" className="m-0 text-xs text-red">{error}</p>}
      <div className="flex items-center gap-2">
        <span className="flex-1 text-[11px] tabular-nums text-faint">{text.length > MAX_NOTE - 200 ? `${MAX_NOTE - text.length} left` : ""}</span>
        <button type="button" onClick={onCancel} className="h-8 rounded-full px-3 text-[13px] font-medium text-muted hover:bg-surface">Cancel</button>
        <button type="button" disabled={!ok} onClick={() => onSave(text)} className="h-8 rounded-full bg-blue px-3.5 text-[13px] font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}

/** The note being written for a freshly highlighted passage. */
export function Composer({ draft, signedOut, onSave, onCancel }: { draft: Draft; signedOut: boolean; onSave: (note: string) => Promise<string | null>; onCancel: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] bg-surface p-3 shadow-[0_2px_10px_rgba(0,0,0,0.06),0_0_0_0.5px_var(--hairline)]">
      <Quote text={draft.quote} />
      {signedOut ? (
        <div className="flex flex-col gap-2">
          <p className="m-0 text-[13px] text-muted">Sign in to save notes to your account.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="h-8 rounded-full px-3 text-[13px] font-medium text-muted hover:bg-fill">Cancel</button>
            <Link href="/login" className="flex h-8 items-center rounded-full bg-blue px-3.5 text-[13px] font-semibold text-white" style={{ textDecoration: "none", color: "#fff" }}>Sign in</Link>
          </div>
        </div>
      ) : (
        <NoteField key={draft.quote} label="Note on the highlighted passage" busy={busy} error={error} onCancel={onCancel}
          onSave={async (t) => { setBusy(true); const err = await onSave(t); setBusy(false); setError(err); }} />
      )}
    </div>
  );
}

const shortDate = (ms: number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(ms);

function NoteCard({ n, active, missing, onOpen, onEdit, onDelete }: {
  n: TopicNote; active: boolean; missing: boolean; onOpen: () => void;
  onEdit: (t: string) => Promise<string | null>; onDelete: () => Promise<string | null>;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (f: () => Promise<string | null>) => { setBusy(true); const err = await f(); setBusy(false); setError(err); return err; };
  return (
    <li id={`note-${n.id}`} className={`flex flex-col gap-2 rounded-[14px] bg-surface p-3 shadow-[0_0_0_0.5px_var(--hairline)] transition-shadow ${active ? "ring-2 ring-[#FFCC00]" : ""}`}>
      <button type="button" onClick={onOpen} className="flex flex-col gap-2 text-left" aria-label={`Go to the passage: ${n.quote.slice(0, 80)}`}>
        <Quote text={n.quote} clamp={!active} />
        {missing && <span className="text-[11px] text-faint">This passage has changed since you noted it.</span>}
      </button>
      {mode === "edit" ? (
        <NoteField initial={n.note} label="Edit note" busy={busy} error={error} onCancel={() => { setMode("view"); setError(null); }}
          onSave={async (t) => { if (!(await run(() => onEdit(t)))) setMode("view"); }} />
      ) : (
        <>
          <p className="m-0 whitespace-pre-wrap break-words text-[14px] leading-snug text-ink">{n.note}</p>
          {error && <p role="alert" className="m-0 text-xs text-red">{error}</p>}
          <div className="-mb-1 flex items-center gap-1">
            <span className="flex-1 text-[11px] text-faint">{shortDate(n.updatedAt)}{n.updatedAt - n.createdAt > 60_000 ? " · edited" : ""}</span>
            {mode === "delete" ? (
              <>
                <span className="text-[12px] text-muted">Delete note?</span>
                <button type="button" onClick={() => setMode("view")} className="h-7 rounded-full px-2.5 text-[12px] font-medium text-muted hover:bg-fill">Keep</button>
                <button type="button" disabled={busy} onClick={() => run(onDelete)} className="h-7 rounded-full bg-red px-2.5 text-[12px] font-semibold text-white disabled:opacity-50">Delete</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setMode("edit")} aria-label="Edit note" className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-fill hover:text-ink"><Icon name="pencil" size={14} /></button>
                <button type="button" onClick={() => setMode("delete")} aria-label="Delete note" className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-fill hover:text-red"><Icon name="trash" size={14} /></button>
              </>
            )}
          </div>
        </>
      )}
    </li>
  );
}

/**
 * "My Notes": what the reader has noted on this topic, by chapter, with the note being written on top. Notes on
 * the open chapter come first; picking one in another chapter opens that chapter.
 */
export function NotesPanel({ status, notes, chapters, cur, active, missing, composer, className = "", onOpen, onEdit, onDelete }: {
  status: Status; notes: TopicNote[]; chapters: string[]; cur: number; active: string | null; missing: Set<string>;
  composer?: React.ReactNode; className?: string;
  onOpen: (n: TopicNote) => void; onEdit: (id: string, t: string) => Promise<string | null>; onDelete: (id: string) => Promise<string | null>;
}) {
  const mine = notes.filter((n) => n.chapter === cur);
  const rest = notes.filter((n) => n.chapter !== cur);
  const title = (c: number) => chapters[c] ?? `Chapter ${c + 1}`;
  const many = chapters.length > 1;
  const card = (n: TopicNote) => (
    <NoteCard key={n.id} n={n} active={active === n.id} missing={missing.has(n.id)} onOpen={() => onOpen(n)}
      onEdit={(t) => onEdit(n.id, t)} onDelete={() => onDelete(n.id)} />
  );
  return (
    <section className={`flex flex-col gap-3 rounded-[18px] bg-fill p-4 ${className}`} style={SANS} aria-label="My Notes">
      <div className="flex shrink-0 items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#FFD60A] to-[#FF9F0A] text-white" aria-hidden><Icon name="note" size={16} /></span>
        <span className="flex-1 text-[15px] font-semibold">My Notes</span>
        {notes.length > 0 && <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted">{notes.length}</span>}
      </div>
      {composer}
      <div className="-mx-1 flex min-h-0 flex-col gap-3 overflow-y-auto px-1 pb-0.5">
        {status === "loading" && <div className="h-16 animate-pulse rounded-[14px] bg-surface/60" aria-label="Loading notes" />}
        {status === "error" && <p className="m-0 text-[13px] text-muted">Your notes could not be loaded. Refresh to try again.</p>}
        {status === "signedOut" && !composer && (
          <p className="m-0 text-[13px] leading-snug text-muted">
            Highlight any passage to note it. <Link href="/login" className="font-medium text-blue">Sign in</Link> to keep your notes in your account.
          </p>
        )}
        {status === "ready" && !notes.length && !composer && (
          <p className="m-0 text-[13px] leading-snug text-muted">Highlight any passage, then choose <b className="font-semibold text-ink">Add note</b>. Notes are saved to your account and only you can see them.</p>
        )}
        {mine.length > 0 && (
          <>
            {many && <h3 className="m-0 truncate text-[11px] font-bold uppercase tracking-[0.05em] text-muted">This chapter · {title(cur)}</h3>}
            <ul className="m-0 flex list-none flex-col gap-2 p-0">{mine.map(card)}</ul>
          </>
        )}
        {rest.length > 0 && [...new Set(rest.map((n) => n.chapter))].map((c) => (
          <div key={c} className="flex flex-col gap-2">
            <h3 className="m-0 truncate text-[11px] font-bold uppercase tracking-[0.05em] text-muted">{many ? `Chapter ${c + 1} · ${title(c)}` : "Notes"}</h3>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">{rest.filter((n) => n.chapter === c).map(card)}</ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/** The composer as a sheet from the bottom of the screen, for screens too narrow for the side panel. */
export function ComposerSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/30 animate-[tt-fade_160ms_ease-out]" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Add a note" className="w-full rounded-t-[22px] bg-fill p-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] animate-[tt-sheet_240ms_cubic-bezier(0.2,0.9,0.3,1)]" style={SANS}>
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-track" aria-hidden />
        <h2 className="m-0 mb-3 text-[17px] font-semibold">Add a note</h2>
        {children}
      </div>
    </div>
  );
}
