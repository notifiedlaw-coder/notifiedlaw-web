"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import type { TopicNote } from "@/lib/notes";
import { NOTE_COLORS, swatchOf, type NoteColor } from "@/lib/note-colors";

const SANS = { fontFamily: "var(--font-serif)" };
const SERIF = "var(--font-serif)";
const MAX_NOTE = 2000;
const BEFORE = 60;

export type Draft = { chapter: number; quote: string; before: string; color: NoteColor; range: Range };
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

/** A character that is part of a word: letters, digits, and apostrophes or hyphens inside a word. */
const WORD = /[\p{L}\p{N}'’-]/u;

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
  // Whole words only: a selection that starts or ends partway through a word takes in all of it.
  while (s > 0 && WORD.test(m.text[s - 1]) && WORD.test(m.text[s])) s--;
  while (e < m.text.length - 1 && WORD.test(m.text[e + 1]) && WORD.test(m.text[e])) e++;
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
    edit: async (id: string, patch: { note?: string; color?: NoteColor }) => {
      const j = await call(`/api/notes/${id}`, "PATCH", patch);
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

/** The pill that appears by a selection in the text, at a point on screen. Pressing it does not clear the selection. */
export function AddNoteButton({ left, top, onAdd }: { left: number; top: number; onAdd: () => void }) {
  return (
    // Acts on press: on a touch screen the tap clears the selection, and the pill with it, before a click would land.
    <button type="button" data-add-note onPointerDown={(e) => { e.preventDefault(); onAdd(); }} onClick={(e) => { if (e.detail === 0) onAdd(); }}
      className="fixed z-40 flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-3.5 text-[13px] font-semibold text-surface shadow-[0_6px_20px_rgba(0,0,0,0.25)] animate-[tt-pop_140ms_ease-out]"
      style={{ ...SANS, left, top }}>
      <Icon name="note" size={14} />Add note
    </button>
  );
}

/** The highlight colours as a row of swatches; picking one calls onPick. */
function ColorPicker({ value, onPick, disabled }: { value: NoteColor; onPick: (c: NoteColor) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Highlight colour" className="flex items-center gap-1.5">
      {NOTE_COLORS.map((c) => {
        const on = c.id === value;
        return (
          <button key={c.id} type="button" role="radio" aria-checked={on} aria-label={c.label} title={c.label} disabled={disabled} onClick={() => onPick(c.id)}
            className="flex size-7 items-center justify-center rounded-full disabled:opacity-50">
            <span className={`block size-5 rounded-full transition-shadow ${on ? "shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--color)]" : "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"}`}
              style={{ background: c.swatch, ["--color" as string]: c.swatch }} />
          </button>
        );
      })}
    </div>
  );
}

const Quote = ({ text, color, clamp = true }: { text: string; color: NoteColor; clamp?: boolean }) => (
  <blockquote style={{ borderColor: swatchOf(color), fontFamily: SERIF }} className={`m-0 border-l-[3px] pl-2.5 text-[13px] italic leading-snug text-muted ${clamp ? "line-clamp-3" : "line-clamp-6"}`}>
    {text}
  </blockquote>
);

function NoteField({ initial = "", busy, error, label, onSave, onCancel }: { initial?: string; busy: boolean; error: string | null; label: string; onSave: (t: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(initial);
  const box = useRef<HTMLTextAreaElement>(null);
  // With a mouse or keyboard, typing can start at once. Touch screens wait for a tap on the field: a browser only
  // opens the on-screen keyboard for a tap, so focusing here would select the field with no keyboard to type with.
  useEffect(() => {
    const t = box.current;
    if (!t || matchMedia("(pointer: coarse)").matches) return;
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
    <div className="nl-note-field flex flex-col gap-2">
      <textarea ref={box} value={text} onChange={(e) => setText(e.target.value)} maxLength={MAX_NOTE} rows={3} aria-label={label} placeholder="Write your note…"
        autoCapitalize="sentences" spellCheck
        // Once the keyboard is up, keep the field and its buttons in view.
        onFocus={(e) => { const t = e.currentTarget; setTimeout(() => t.closest(".nl-note-field")?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 350); }}
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.preventDefault(); onCancel(); }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && ok) { e.preventDefault(); onSave(text); }
        }}
        className="min-h-[88px] w-full resize-none rounded-[10px] bg-surface px-3 py-2.5 text-[16px] leading-snug md:min-h-[76px] md:py-2 md:text-[14px] text-ink shadow-[0_0_0_0.5px_var(--hairline)] outline-none placeholder:text-faint focus-visible:ring-2 focus-visible:ring-blue/40" />
      {error && <p role="alert" className="m-0 text-xs text-red">{error}</p>}
      <div className="flex items-center gap-2">
        <span className="flex-1 text-[11px] tabular-nums text-faint">{text.length > MAX_NOTE - 200 ? `${MAX_NOTE - text.length} left` : ""}</span>
        <button type="button" onClick={onCancel} className="h-10 rounded-full px-4 text-[15px] font-medium text-muted hover:bg-surface md:h-8 md:px-3 md:text-[13px]">Cancel</button>
        <button type="button" disabled={!ok} onClick={() => onSave(text)} className="h-10 rounded-full bg-blue px-5 text-[15px] font-semibold text-white disabled:opacity-50 md:h-8 md:px-3.5 md:text-[13px]">{busy ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}

/** The note being written for a freshly highlighted passage. */
export function Composer({ draft, signedOut, onColor, onSave, onCancel }: { draft: Draft; signedOut: boolean; onColor: (c: NoteColor) => void; onSave: (note: string) => Promise<string | null>; onCancel: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] bg-surface p-3 shadow-[0_2px_10px_rgba(0,0,0,0.06),0_0_0_0.5px_var(--hairline)]">
      <Quote text={draft.quote} color={draft.color} />
      {!signedOut && <ColorPicker value={draft.color} onPick={onColor} />}
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
  onEdit: (patch: { note?: string; color?: NoteColor }) => Promise<string | null>; onDelete: () => Promise<string | null>;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (f: () => Promise<string | null>) => { setBusy(true); const err = await f(); setBusy(false); setError(err); return err; };
  return (
    // Anywhere on the card goes to the passage, except its own buttons and the editor.
    <li id={`note-${n.id}`} onClick={(e) => { if (mode === "view" && !(e.target as Element).closest("button, textarea, input, a")) onOpen(); }}
      className={`flex flex-col gap-2 rounded-[14px] bg-surface p-3 shadow-[0_0_0_0.5px_var(--hairline)] transition-shadow ${mode === "view" ? "cursor-pointer hover:shadow-[0_0_0_0.5px_var(--hairline),0_2px_8px_rgba(0,0,0,0.06)]" : ""} ${active ? "ring-2 ring-[#FFCC00]" : ""}`}>
      <button type="button" onClick={onOpen} className="flex flex-col gap-2 text-left" aria-label={`Go to the passage: ${n.quote.slice(0, 80)}`}>
        <Quote text={n.quote} color={n.color} clamp={!active} />
        {missing && <span className="text-[11px] text-faint">This passage has changed since you noted it.</span>}
      </button>
      {mode === "edit" ? (
        <>
          <ColorPicker value={n.color} disabled={busy} onPick={(color) => { if (color !== n.color) run(() => onEdit({ color })); }} />
          <NoteField initial={n.note} label="Edit note" busy={busy} error={error} onCancel={() => { setMode("view"); setError(null); }}
            onSave={async (t) => { if (!(await run(() => onEdit({ note: t })))) setMode("view"); }} />
        </>
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
                <button type="button" onClick={() => setMode("edit")} aria-label="Edit note or colour" className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-fill hover:text-ink"><Icon name="pencil" size={14} /></button>
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
 * The Notes tab of the reader's sidebar: what the reader has noted on this topic, by page, with the note being
 * written on top. Notes on the open page come first; picking one on another page opens that page.
 */
export function NotesPanel({ status, notes, chapters, cur, active, missing, composer, onOpen, onEdit, onDelete }: {
  status: Status; notes: TopicNote[]; chapters: string[]; cur: number; active: string | null; missing: Set<string>;
  composer?: React.ReactNode;
  onOpen: (n: TopicNote) => void; onEdit: (id: string, patch: { note?: string; color?: NoteColor }) => Promise<string | null>; onDelete: (id: string) => Promise<string | null>;
}) {
  const mine = notes.filter((n) => n.chapter === cur);
  const rest = notes.filter((n) => n.chapter !== cur);
  const title = (c: number) => chapters[c] ?? `Page ${c + 1}`;
  const many = chapters.length > 1;
  const card = (n: TopicNote) => (
    <NoteCard key={n.id} n={n} active={active === n.id} missing={missing.has(n.id)} onOpen={() => onOpen(n)}
      onEdit={(patch) => onEdit(n.id, patch)} onDelete={() => onDelete(n.id)} />
  );
  return (
    <div className="flex flex-col gap-3" style={SANS}>
      {composer}
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
          {many && <h3 className="m-0 truncate text-[11px] font-bold uppercase tracking-[0.05em] text-muted">This page · {title(cur)}</h3>}
          <ul className="m-0 flex list-none flex-col gap-2 p-0">{mine.map(card)}</ul>
        </>
      )}
      {rest.length > 0 && [...new Set(rest.map((n) => n.chapter))].map((c) => (
        <div key={c} className="flex flex-col gap-2">
          <h3 className="m-0 truncate text-[11px] font-bold uppercase tracking-[0.05em] text-muted">{many ? `Page ${c + 1} · ${title(c)}` : "Notes"}</h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">{rest.filter((n) => n.chapter === c).map(card)}</ul>
        </div>
      ))}
    </div>
  );
}
