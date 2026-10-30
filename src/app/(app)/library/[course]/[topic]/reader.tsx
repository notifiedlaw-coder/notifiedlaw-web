"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Gate } from "@/components/ui";
import { Markdown, splitPages, type Page } from "@/components/markdown";
import type { TopicNote } from "@/lib/notes";
import { DEFAULT_COLOR, NOTE_COLORS, isNoteColor, type NoteColor } from "@/lib/note-colors";
import { AddNoteButton, Composer, NotesPanel, findPassage, paint, passageOf, textMap, useTopicNotes, type Draft } from "./notes";

const SERIF = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";
const WIDE = "(min-width: 1280px)"; // Tailwind's xl, where the sidebar stays open
const COLOR_KEY = "nl-note-color"; // the colour last picked, for the next note
/** The CSS highlight for each colour, from the same swatch the picker shows: a light mark, and a stronger "-on" one for the picked note or the draft. */
const HIGHLIGHTS = NOTE_COLORS.map((c) =>
  `::highlight(nl-${c.id}){background-color:color-mix(in srgb,${c.swatch} 35%,transparent)}::highlight(nl-${c.id}-on){background-color:color-mix(in srgb,${c.swatch} 60%,transparent)}`).join("");
const PILL_W = 112; // the "Add note" pill's width, near enough, for keeping it on screen
type Tab = "summary" | "notes";
/** The bottom sheet's heights, as in Apple's sheets: half the screen with the text still in view, or nearly all of it. */
type Detent = "medium" | "large";

/**
 * A topic written in Notion (Markdown), read a page at a time: each heading 1 is a chapter starting on a new page,
 * and its text flows across pages of about equal length (see splitPages). A bar at the top jumps to any chapter, sub-chapter
 * or section and steps through the pages; the foot of each page
 * leads to the previous and next one. On the right is a sidebar with two tabs:
 * the AI Summary (coming soon) and Notes, where a highlighted passage can be given a note saved to the reader's
 * account. Wide screens keep the sidebar open; narrower ones show it as a bottom sheet, opened from a glass bar
 * floating over the text. Along the bottom, between the app's
 * sidebar and this one, is a player bar for the topic's podcast (coming soon).
 */
export function Reader({ course, slug, n, title, lock = null, body, topicId = null }: { course: string; slug: string; n: number; title: string; lock?: "Student" | "Pro Max" | null; body: string; topicId?: string | null }) {
  const [cur, setCur] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);

  // A saved note's `chapter` is the page it was made on.
  const pages = useMemo(() => splitPages(body, title), [body, title]);
  const total = pages.length;
  const page = pages[Math.min(cur, total - 1)];
  const chapterCount = pages[total - 1].chapter + 1;
  const minutes = Math.max(1, Math.round(body.split(/\s+/).length / 200));
  const go = (i: number) => {
    if (i < 0 || i >= total) return;
    setCur(i);
    setDraft(null);
    setActive(null);
    scroller.current?.scrollTo({ top: 0 });
  };
  // Parsed once per page, so selecting text (which re-renders) leaves the text's DOM, and the selection, alone.
  const md = useMemo(() => <Markdown source={page.md} from={3} />, [page.md]);


  // ---- notes
  const notes = useTopicNotes(topicId);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pick, setPick] = useState<{ left: number; top: number } | null>(null);
  // The selection the pill was shown for. Kept, because tapping the pill on a touch screen clears the selection.
  const picked = useRef<Range | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [wide, setWide] = useState(false);
  const ranges = useRef(new Map<string, Range>());
  const reveal = useRef<string | null>(null);
  const [jump, setJump] = useState(0);

  // ---- sidebar
  const [tab, setTab] = useState<Tab>("notes");
  const [sheet, setSheet] = useState<Detent | null>(null);
  const [docked, setDocked] = useState(true); // the floating bar, hidden while reading on down the page
  const showNotes = () => { setTab("notes"); if (!wide) setSheet((d) => d ?? "medium"); };
  const openSheet = (t: Tab) => { setTab(t); setSheet("medium"); };
  const closeSheet = () => { setSheet(null); setDraft(null); };

  // Left and right arrow keys turn the page, unless they are moving a caret or a selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== "ArrowLeft" && e.key !== "ArrowRight") || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable='true'], [role=tablist]")) return;
      setCur((c) => {
        const next = Math.max(0, Math.min(total - 1, c + (e.key === "ArrowRight" ? 1 : -1)));
        if (next !== c) { setDraft(null); setActive(null); scroller.current?.scrollTo({ top: 0 }); }
        return next;
      });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [total]);

  useEffect(() => {
    const m = matchMedia(WIDE);
    const on = () => { setWide(m.matches); if (m.matches) setSheet(null); };
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);

  // The floating bar steps aside while the reader scrolls on down, and comes back on a scroll up or at the page's end.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let last = el.scrollTop;
    const onScroll = () => {
      const y = el.scrollTop;
      if (Math.abs(y - last) < 8) return;
      setDocked(y < last || y < 80 || y + el.clientHeight >= el.scrollHeight - 40);
      last = y;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  /*
   * The "Add note" pill for a selection made inside the text. With a mouse or pen it shows once the button is
   * released, just above and to the right of where the pointer was, and moves with the text as it scrolls. On touch
   * screens, and for a selection made with the keyboard, it sits under the selection, clear of the system's menu.
   */
  useEffect(() => {
    if (!topicId) return;
    const el = scroller.current;
    const ptr = { x: 0, y: 0, scroll: 0, down: false, used: false };
    let frame = 0;
    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const sel = getSelection();
        const r = sel && sel.rangeCount && !sel.isCollapsed ? sel.getRangeAt(0) : null;
        if (ptr.down || !r || !text.current?.contains(r.commonAncestorContainer) || r.toString().trim().length < 2) return setPick(null);
        picked.current = r.cloneRange();
        // Desktop content is scaled with CSS zoom (.nl-content), which scales the pill's position too.
        const z = parseFloat(getComputedStyle(text.current.closest(".nl-content") ?? document.body).zoom) || 1;
        const at = (left: number, top: number) => setPick({ left: left / z, top: top / z });
        if (ptr.used) {
          const y = ptr.y - ((el?.scrollTop ?? 0) - ptr.scroll);
          const view = el?.getBoundingClientRect();
          if (view && (y < view.top || y > view.bottom)) return setPick(null);
          const top = y - 46 * z;
          at(Math.max(8, Math.min(ptr.x + 8, innerWidth - PILL_W * z - 8)), top < 8 ? y + 20 : top);
        } else {
          const b = r.getBoundingClientRect();
          at(Math.max(8, Math.min(b.left + (b.width - PILL_W * z) / 2, innerWidth - PILL_W * z - 8)), b.bottom + 10);
        }
      });
    };
    const down = (e: PointerEvent) => {
      // Pressing the pill itself must leave it, and the selection, where they are.
      if (e.target instanceof Element && e.target.closest("[data-add-note]")) return;
      ptr.used = e.pointerType !== "touch";
      ptr.down = ptr.used;
      if (ptr.down) setPick(null);
    };
    const up = (e: PointerEvent) => {
      if (!ptr.down) return;
      Object.assign(ptr, { x: e.clientX, y: e.clientY, scroll: el?.scrollTop ?? 0, down: false });
      check();
    };
    const key = (e: KeyboardEvent) => { if (e.shiftKey) ptr.used = false; };
    document.addEventListener("selectionchange", check);
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("keydown", key);
    el?.addEventListener("scroll", check, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("selectionchange", check);
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("keydown", key);
      el?.removeEventListener("scroll", check);
    };
  }, [topicId]);

  const startNote = () => {
    const sel = getSelection();
    const r = picked.current ?? (sel?.rangeCount ? sel.getRangeAt(0) : null);
    if (!text.current || !r) return;
    const p = passageOf(textMap(text.current), r);
    picked.current = null;
    sel?.removeAllRanges();
    setPick(null);
    let color: NoteColor = DEFAULT_COLOR;
    try { const c = localStorage.getItem(COLOR_KEY); if (isNoteColor(c)) color = c; } catch {}
    if (!p) return;
    setDraft({ chapter: cur, color, ...p });
    setActive(null);
    showNotes();
    // Above the card, which covers the lower part of the text on narrow screens.
    const el = scroller.current;
    if (!wide && el) el.scrollBy({ top: p.range.getBoundingClientRect().top - el.getBoundingClientRect().top - 24, behavior: "smooth" });
  };

  // Marks the noted passages of the open chapter, and finds where each one is for jumping to it.
  useLayoutEffect(() => {
    if (!text.current) return;
    const m = textMap(text.current);
    const found = new Map<string, Range>();
    const lost = new Set<string>();
    for (const x of notes.notes) {
      if (x.chapter !== cur) continue;
      const r = findPassage(m, x.quote, x.before);
      if (r) found.set(x.id, r); else lost.add(x.id);
    }
    ranges.current = found;
    setMissing((old) => (old.size === lost.size && [...lost].every((id) => old.has(id)) ? old : lost));
    const on = active && found.has(active) ? active : null;
    const color = new Map(notes.notes.map((x) => [x.id, x.color]));
    for (const c of NOTE_COLORS) {
      paint(`nl-${c.id}`, [...found].filter(([id]) => id !== on && color.get(id) === c.id).map(([, r]) => r));
      paint(`nl-${c.id}-on`, on && color.get(on) === c.id ? [found.get(on)!] : !on && draft?.color === c.id ? [draft.range] : []);
    }
    const want = reveal.current;
    if (want && found.has(want)) {
      reveal.current = null;
      const box = scroller.current!.getBoundingClientRect();
      scroller.current!.scrollBy({ top: found.get(want)!.getBoundingClientRect().top - box.top - box.height / 3, behavior: "smooth" });
    }
  }, [notes.notes, cur, md, active, draft, jump]);
  useEffect(() => () => NOTE_COLORS.forEach((c) => { paint(`nl-${c.id}`, []); paint(`nl-${c.id}-on`, []); }), []);

  // Picking a note scrolls its passage into view, opening its chapter first if need be.
  const open = (x: TopicNote) => {
    setActive(x.id);
    setDraft(null);
    reveal.current = x.id;
    setJump((j) => j + 1);
    setSheet(null);
    if (x.chapter !== cur && x.chapter < total) go(x.chapter);
  };
  // Clicking a marked passage picks its note in the panel.
  const onTextClick = () => {
    const sel = getSelection();
    if (!sel?.isCollapsed || !sel.anchorNode) return;
    const hit = [...ranges.current].find(([, r]) => r.isPointInRange(sel.anchorNode!, sel.anchorOffset));
    setActive(hit?.[0] ?? null);
    if (!hit) return;
    showNotes();
    requestAnimationFrame(() => document.getElementById(`note-${hit[0]}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  };

  const save = async (note: string) => {
    if (!draft) return null;
    const err = await notes.add({ chapter: draft.chapter, quote: draft.quote, before: draft.before, color: draft.color }, note);
    if (!err) {
      try { localStorage.setItem(COLOR_KEY, draft.color); } catch {}
      setDraft(null);
      navigator.vibrate?.(8);
    }
    return err;
  };
  const composer = draft && <Composer draft={draft} signedOut={notes.status === "signedOut"} onColor={(color) => setDraft({ ...draft, color })} onSave={save} onCancel={() => setDraft(null)} />;
  const sidebar = (onClose?: () => void) => (
    <Sidebar tab={tab} onTab={setTab} count={notes.notes.length} onClose={onClose}>
      {tab === "summary" ? <Summary /> : topicId ? (
        <NotesPanel status={notes.status} notes={notes.notes} chapters={pages.map((p) => p.title ?? p.chapterTitle)} cur={cur} active={active} missing={missing}
          composer={composer} onOpen={open} onEdit={notes.edit} onDelete={notes.remove} />
      ) : <p className="m-0 text-[13px] leading-snug text-muted" style={SANS}>Notes open once you can read this topic.</p>}
    </Sidebar>
  );

  return (
    <div className="relative flex h-full">
      <style>{HIGHLIGHTS}</style>
      {lock === "Pro Max" && <Gate title="Pre-Bar and Bar Course come with Supreme Justice (Max)" body="Upgrade to read every note." cta="Unlock with Supreme Justice (Max)" color="#AF52DE" />}
      {lock === "Student" && <Gate title="Choose a plan to keep reading" body="The first two topics of every course are open as a preview. Student unlocks every topic from Level 100 to 400." cta="See plans" />}
      <div className="flex min-w-0 flex-1 flex-col">
      <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-surface">
        {total > 1 && <PageBar pages={pages} cur={cur} chapterCount={chapterCount} onGo={go} />}
        <div className="mx-auto flex max-w-[1100px] justify-center px-5 md:px-8">
        {/* Text wraps to the column: long words and links break rather than run off the side. */}
        <article className="min-w-0 max-w-[680px] flex-1 break-words pb-24 pt-7 text-[17px] leading-[1.6] md:pt-10 md:text-[18px] md:leading-[1.65] xl:pb-10" style={{ fontFamily: SERIF }}>
          <div className="text-xs font-bold uppercase tracking-[0.05em] text-muted" style={SANS}>{course} · Topic {n}</div>
          <h1 className="mb-2 mt-2 text-[26px] font-bold leading-[1.15] tracking-[-0.01em] md:text-[34px]">{title}</h1>
          <div className="mb-6 text-[13px] text-muted" style={SANS}>
            {chapterCount} {chapterCount === 1 ? "chapter" : "chapters"}{total > chapterCount ? ` · ${total} pages` : ""} · {minutes} min read
          </div>
          {cur === 0 || pages[cur - 1].chapter !== page.chapter ? (
            <>
              {chapterCount > 1 && <div className="mt-8 text-[13px] font-semibold text-muted" style={SANS}>Chapter {page.chapter + 1}</div>}
              <h2 className="mb-3 mt-1.5 text-[22px] font-bold leading-tight tracking-[-0.01em] md:text-[26px]">{page.chapterTitle}</h2>
            </>
          ) : (
            // A later page of the chapter: where the reader is, then the text carries on from the page before.
            <div className="mb-4 mt-8 text-[13px] font-semibold text-muted" style={SANS}>
              {chapterCount > 1 ? `Chapter ${page.chapter + 1} · ` : ""}{page.chapterTitle}{page.cont ? ` › ${page.title} (continued)` : ""}
            </div>
          )}
          {/* Selectable so passages can be highlighted for notes; CopyGuard still blocks copy, cut, drag and right-click. */}
          <div ref={text} onClick={topicId ? onTextClick : undefined} className={topicId ? "nl-selectable" : undefined}>{md}</div>
          <Pagination pages={pages} cur={cur} back={`/library/${slug}`} onGo={go} />
        </article>
        </div>
      </div>
      {!wide && sheet && <Sheet detent={sheet} onDetent={setSheet} onClose={closeSheet}>{sidebar(closeSheet)}</Sheet>}
      {!wide && <Dock count={notes.notes.length} hidden={!!sheet || !docked} onOpen={openSheet} />}
      </div>
      <Podcast title={title} minutes={minutes} />
      </div>
      {wide && <aside className="flex w-[340px] shrink-0 flex-col border-l border-edge/10 bg-fill/50" aria-label="AI Summary and Notes">{sidebar()}</aside>}
      {pick && <AddNoteButton left={pick.left} top={pick.top} onAdd={startNote} />}
    </div>
  );
}

const SANS = { fontFamily: "var(--font-sans)" };
// Orange mixed toward the ink colour, so the label reads in both light and dark themes.
const Soon = () => <span className="shrink-0 rounded-full bg-[#FF9500]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em]" style={{ color: "color-mix(in srgb, #FF9500 62%, var(--ink))" }}>Coming soon</span>;

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "summary", label: "AI Summary", icon: "sparkle" },
  { id: "notes", label: "Notes", icon: "note" },
];

/** The reader's sidebar: AI Summary and Notes as tabs, the open one filling the space below. */
function Sidebar({ tab, onTab, count, onClose, children }: { tab: Tab; onTab: (t: Tab) => void; count: number; onClose?: () => void; children: React.ReactNode }) {
  const list = useRef<HTMLDivElement>(null);
  // Left and right arrows move between the tabs.
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = TABS[(TABS.findIndex((t) => t.id === tab) + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length].id;
    onTab(next);
    list.current?.querySelector<HTMLButtonElement>(`#tab-${next}`)?.focus();
  };
  return (
    <>
      <div className="flex shrink-0 items-center gap-2 p-3" style={SANS}>
        <div ref={list} role="tablist" aria-label="Sidebar" onKeyDown={onKey} className="flex flex-1 rounded-[10px] bg-track/70 p-0.5">
          {TABS.map((t) => {
            const on = t.id === tab;
            return (
              <button key={t.id} id={`tab-${t.id}`} type="button" role="tab" aria-selected={on} aria-controls="sidebar-panel" tabIndex={on ? 0 : -1} onClick={() => onTab(t.id)}
                className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[8px] text-[13px] font-semibold transition-colors ${on ? "bg-surface text-ink shadow-[0_1px_3px_rgba(0,0,0,0.12)]" : "text-muted hover:text-ink"}`}>
                <Icon name={t.icon} size={14} />{t.label}
                {t.id === "notes" && count > 0 && <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${on ? "bg-fill" : "bg-surface/70"}`}>{count}</span>}
              </button>
            );
          })}
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-track/70 text-muted hover:text-ink">
            <Icon name="close" size={13} />
          </button>
        )}
      </div>
      <div id="sidebar-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-1">{children}</div>
    </>
  );
}

/**
 * On screens too narrow to keep the sidebar open: a frosted capsule floating over the text, like the toolbars in
 * Apple's apps, with one half for each tab so a single tap opens the one wanted. It slides away while the reader
 * scrolls on down the page and comes back when they scroll up.
 */
function Dock({ count, hidden, onOpen }: { count: number; hidden: boolean; onOpen: (t: Tab) => void }) {
  const half = "flex h-11 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition-colors hover:bg-fill/70 active:bg-fill";
  return (
    <div role="toolbar" aria-label="AI Summary and Notes" aria-hidden={hidden} inert={hidden} style={SANS}
      className={`absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-20 flex -translate-x-1/2 items-center rounded-full bg-surface/75 p-1 text-ink shadow-[0_8px_30px_rgba(0,0,0,0.12),0_0_0_0.5px_var(--hairline)] backdrop-blur-xl backdrop-saturate-150 motion-safe:transition-[translate,opacity] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.2,0.9,0.3,1)] ${hidden ? "pointer-events-none translate-y-[calc(100%+24px)] opacity-0" : ""}`}>
      <button type="button" onClick={() => onOpen("summary")} className={half}>
        <span className="text-[#FF9F0A]"><Icon name="sparkle" size={16} /></span>Summary
      </button>
      <span className="h-5 w-px bg-edge/15" aria-hidden />
      <button type="button" onClick={() => onOpen("notes")} aria-label={`Notes${count ? `, ${count}` : ""}`} className={half}>
        <span className="text-[#FF9F0A]"><Icon name="note" size={16} /></span>Notes
        {count > 0 && <span className="rounded-full bg-fill px-1.5 text-[12px] tabular-nums text-muted">{count}</span>}
      </button>
    </div>
  );
}

/**
 * The sidebar as a sheet that rises from the bottom, in Apple's style: a grabber to drag it between half height
 * (the text above stays in view and scrolls) and nearly full height (the text dims behind it), or down to close it.
 * Tapping the grabber switches height; Escape, the close button or tapping the dimmed text closes it. On tablets
 * it floats as a card at the bottom right.
 */
function Sheet({ detent, onDetent, onClose, children }: { detent: Detent; onDetent: (d: Detent) => void; onClose: () => void; children: React.ReactNode }) {
  const [dy, setDy] = useState<number | null>(null); // how far the grabber has been dragged down; null when not dragging
  const drag = useRef<{ y: number; moved: boolean } | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const large = detent === "large";
  const end = () => {
    const d = drag.current;
    drag.current = null;
    const by = dy ?? 0;
    setDy(null);
    if (!d?.moved) return onDetent(large ? "medium" : "large");
    if (by < -40) onDetent("large");
    else if (by > (large ? 240 : 80)) onClose();
    else if (by > 60) onDetent("medium");
  };
  return (
    <>
      {large && <div className="absolute inset-0 z-30 bg-black/25 motion-safe:animate-[tt-fade_200ms_ease-out]" onPointerDown={onClose} aria-hidden />}
      <div role="dialog" aria-label="AI Summary and Notes"
        className={`absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-[22px] bg-surface/90 shadow-[0_-8px_40px_rgba(0,0,0,0.18),0_0_0_0.5px_var(--hairline)] backdrop-blur-2xl backdrop-saturate-150 motion-safe:animate-[tt-sheet_300ms_cubic-bezier(0.2,0.9,0.3,1)] sm:bottom-3 sm:left-auto sm:right-3 sm:w-[400px] sm:rounded-[22px] ${dy === null ? "motion-safe:transition-[height] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.2,0.9,0.3,1)]" : ""}`}
        style={{ height: large ? "calc(100% - 12px)" : "min(52%, 480px)", translate: dy ? `0 ${Math.max(0, dy)}px` : undefined }}>
        <button type="button" aria-label={large ? "Make smaller" : "Make larger"}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { y: e.clientY, moved: false }; setDy(0); }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            if (Math.abs(e.clientY - d.y) > 4) d.moved = true;
            setDy(e.clientY - d.y);
          }}
          onPointerUp={end}
          onPointerCancel={() => { drag.current = null; setDy(null); }}
          onClick={(e) => { if (e.detail === 0) onDetent(large ? "medium" : "large"); }}
          className="flex h-5 shrink-0 cursor-grab touch-none items-end justify-center active:cursor-grabbing">
          <span className="h-[5px] w-9 rounded-full bg-track" aria-hidden />
        </button>
        {children}
      </div>
    </>
  );
}

const pageName = (p: Page) => p.title ?? p.chapterTitle;

/**
 * The bar pinned to the top of the text: a menu of every chapter and its pages, a stepper to the previous and next
 * page, and a hairline showing how far through the topic the page is. Styled after the toolbars in Apple's apps.
 */
function PageBar({ pages, cur, chapterCount, onGo }: { pages: Page[]; cur: number; chapterCount: number; onGo: (i: number) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const page = pages[cur];
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    // The current page in view when the menu opens.
    box.current?.querySelector("[aria-current=page]")?.scrollIntoView({ block: "nearest" });
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", key); };
  }, [open]);
  const pick = (i: number) => { setOpen(false); onGo(i); };
  const chapters = [...new Set(pages.map((p) => p.chapter))];
  const step = "flex size-10 md:size-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-track/70 disabled:text-faint disabled:hover:bg-transparent";
  return (
    <div ref={box} className="sticky top-0 z-20 border-b border-edge/10 bg-surface/80 backdrop-blur-xl backdrop-saturate-150" style={SANS}>
      <div className="mx-auto flex h-14 max-w-[1100px] items-center px-3 md:h-[52px] md:px-8">
        <div className="mx-auto flex w-full max-w-[720px] items-center gap-2">
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" aria-label={`Chapters and pages. Now: ${pageName(page)}`}
            className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-fill pl-3 pr-2.5 md:h-9 text-left text-[13px] transition-colors hover:bg-track/70 md:flex-none md:max-w-[460px]">
            <Icon name="list" size={15} className="shrink-0 text-muted" />
            <span className="min-w-0 flex-1 truncate">
              {chapterCount > 1 && <span className="text-muted">Ch. {page.chapter + 1} · </span>}
              <span className="font-semibold">{pageName(page)}</span>
            </span>
            <Icon name="chevron" size={14} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          <span className="hidden flex-1 md:block" />
          <div className="flex shrink-0 items-center rounded-full bg-fill p-0.5">
            <button type="button" onClick={() => onGo(cur - 1)} disabled={cur === 0} aria-label="Previous page" className={step}><Icon name="back" size={14} /></button>
            <span className="min-w-[44px] text-center text-[13px] font-medium tabular-nums text-muted" aria-live="polite">{cur + 1} / {pages.length}</span>
            <button type="button" onClick={() => onGo(cur + 1)} disabled={cur === pages.length - 1} aria-label="Next page" className={step}><Icon name="back" size={14} className="rotate-180" /></button>
          </div>
        </div>
      </div>
      <div className="h-[2px]" aria-hidden><div className="h-full bg-blue transition-[width] duration-300" style={{ width: `${((cur + 1) / pages.length) * 100}%` }} /></div>
      {open && (
        <div role="menu" aria-label="Chapters and pages"
          className="absolute left-3 right-3 top-full mt-2 max-h-[min(70vh,520px)] origin-top overflow-y-auto overscroll-contain rounded-[16px] bg-surface p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.2),0_0_0_0.5px_var(--hairline)] animate-[tt-pop_140ms_ease-out] md:left-1/2 md:right-auto md:w-[440px] md:-translate-x-1/2">
          {chapters.map((c) => {
            const mine = pages.map((p, i) => ({ p, i })).filter(({ p }) => p.chapter === c);
            const head = mine[0].p;
            // Each sub-chapter and section with the page it starts on; the one the current page is in is ticked.
            const heads = mine.flatMap(({ p, i }) => p.heads.map((h) => ({ ...h, i })));
            const here = page.chapter === c ? heads.findLastIndex((h) => h.i <= cur) : -1;
            return (
              <div key={c} className="py-1 [&+&]:border-t [&+&]:border-edge/10">
                {!heads.length ? (
                  <MenuRow on={page.chapter === c} onClick={() => pick(mine[0].i)} n={chapterCount > 1 ? c + 1 : null} page={mine[0].i} strong>{head.chapterTitle}</MenuRow>
                ) : (
                  <>
                    <MenuRow on={page.chapter === c && here < 0} onClick={() => pick(mine[0].i)} n={chapterCount > 1 ? c + 1 : null} page={mine[0].i} strong>{head.chapterTitle}</MenuRow>
                    {heads.map((h, k) => <MenuRow key={k} on={k === here} onClick={() => pick(h.i)} page={h.i} indent={h.level === 3 ? 1 : 2}>{h.title}</MenuRow>)}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** `page` (0-based) shows as the page number the row opens, on the right. */
function MenuRow({ on, onClick, n = null, page, strong, indent = 0, children }: { on: boolean; onClick: () => void; n?: number | null; page: number; strong?: boolean; indent?: 0 | 1 | 2; children: React.ReactNode }) {
  return (
    <button type="button" role="menuitem" aria-current={on ? "page" : undefined} onClick={onClick}
      className={`flex min-h-11 w-full items-center gap-2.5 rounded-[10px] py-2 pr-3 text-left leading-snug transition-colors ${["pl-3", "pl-4", "pl-9"][indent]} ${indent === 2 ? "text-[13px]" : "text-[14px]"} ${on ? "bg-blue/10 text-blue" : "hover:bg-fill"}`}>
      <span className="flex w-4 shrink-0 justify-center" aria-hidden>{on && <Icon name="tick" size={14} />}</span>
      {n !== null && <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Ch. {n}</span>}
      <span className={`min-w-0 flex-1 ${strong || on ? "font-semibold" : ""}`}>{children}</span>
      <span className={`shrink-0 text-[12px] tabular-nums ${on ? "" : "text-muted"}`}>{page + 1}</span>
    </button>
  );
}

/** The foot of a page: Previous and Next buttons, Apple's page dots, and the way back to the course after the last page. */
function Pagination({ pages, cur, back, onGo }: { pages: Page[]; cur: number; back: string; onGo: (i: number) => void }) {
  const btn = "flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-full px-5 text-[15px] font-semibold transition-colors active:scale-[0.98]";
  const plain = `${btn} bg-fill text-ink hover:bg-track/70`;
  const main = `${btn} bg-blue text-white hover:bg-blue-press`;
  return (
    <nav aria-label="Pages" className="mt-10 border-t border-edge/10 pt-6" style={SANS}>
      <div className="grid grid-cols-2 gap-3">
        {cur > 0 ? (
          <button type="button" onClick={() => onGo(cur - 1)} aria-label={`Previous: ${pageName(pages[cur - 1])}`} className={plain}><Icon name="back" size={14} />Previous</button>
        ) : <span />}
        {cur < pages.length - 1 ? (
          <button type="button" onClick={() => onGo(cur + 1)} aria-label={`Next: ${pageName(pages[cur + 1])}`} className={main}>Next<Icon name="back" size={14} className="rotate-180" /></button>
        ) : (
          <a href={back} className={main} style={{ textDecoration: "none", color: "#fff" }}>Back to course</a>
        )}
      </div>
      {pages.length > 1 && (
        pages.length <= 15 ? (
          <div className="mt-5 flex items-center justify-center gap-1.5">
            {pages.map((p, i) => (
              <button key={i} type="button" onClick={() => onGo(i)} aria-label={`Page ${i + 1}: ${pageName(p)}`} aria-current={i === cur ? "page" : undefined}
                className="flex h-6 items-center justify-center px-0.5">
                <span className={`block h-2 rounded-full transition-all duration-300 ${i === cur ? "w-5 bg-ink" : "w-2 bg-track hover:bg-faint"}`} />
              </button>
            ))}
          </div>
        ) : <p className="m-0 mt-5 text-center text-[12px] tabular-nums text-muted">Page {cur + 1} of {pages.length}</p>
      )}
    </nav>
  );
}

/** The AI Summary of a topic: the key rules and cases in a minute's read. Not built yet, so it shows its shape. */
function Summary() {
  return (
    <section className="flex flex-col gap-3" style={SANS} aria-label="AI Summary, coming soon">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#5AC8FA] to-[#007AFF] text-white" aria-hidden><Icon name="sparkle" size={16} /></span>
        <span className="flex-1 text-[15px] font-semibold">AI Summary</span>
        <Soon />
      </div>
      <p className="m-0 text-[13px] leading-snug text-muted">This topic in a one-minute read: the key rules, the cases behind them, and what examiners look for.</p>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0" aria-hidden>
        {[[92, 70], [84, 58], [88, 40]].map(([a, b], i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-[5px] size-1.5 shrink-0 rounded-full bg-track" />
            <span className="flex flex-1 flex-col gap-1.5">
              <span className="h-2 rounded-full bg-track" style={{ width: `${a}%` }} />
              <span className="h-2 rounded-full bg-track/70" style={{ width: `${b}%` }} />
            </span>
          </li>
        ))}
      </ul>
      <button type="button" disabled className="h-9 rounded-full bg-surface text-[13px] font-semibold text-muted shadow-[0_0_0_0.5px_var(--hairline)]">Summarise this topic</button>
    </section>
  );
}

const Skip = ({ back }: { back?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={back ? "M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" : "M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4"} />
    <text x="12" y="15.5" fontSize="7" fontWeight="700" textAnchor="middle" fill="currentColor" stroke="none">{back ? 15 : 30}</text>
  </svg>
);

/**
 * The topic's podcast as a player bar along the bottom of the reader: what is playing on the left, the controls and
 * progress centred, speed and volume on the right. Not built yet, so its controls are off.
 */
function Podcast({ title, minutes }: { title: string; minutes: number }) {
  const length = Math.max(3, Math.round(minutes * 0.6));
  return (
    <section className="relative z-10 grid shrink-0 grid-cols-[1fr_auto] items-center gap-3 border-t border-edge/10 bg-surface px-3 py-2.5 pb-[max(10px,env(safe-area-inset-bottom))] md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)] md:gap-6 md:px-4" style={SANS} aria-label="Topic podcast, coming soon">
      {/* On phones the progress is a hairline along the top of the bar. */}
      <span className="absolute inset-x-0 top-0 h-0.5 bg-track md:hidden" aria-hidden />
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-[8px] bg-gradient-to-br from-[#D06BFF] to-[#5856D6] text-white shadow-[0_2px_8px_rgba(88,86,214,0.35)]" aria-hidden><Icon name="headphones" size={22} /></span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[14px] font-semibold">{title}</span>
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[12px] text-muted">AI podcast · {length} min</span>
            <span className="md:hidden"><Soon /></span>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-4 text-muted">
          <button type="button" disabled aria-label="Back 15 seconds" className="hidden size-8 items-center justify-center rounded-full opacity-50 md:flex"><Skip back /></button>
          <button type="button" disabled aria-label="Play, coming soon" className="flex size-10 items-center justify-center rounded-full bg-ink text-surface opacity-40">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" /></svg>
          </button>
          <button type="button" disabled aria-label="Forward 30 seconds" className="hidden size-8 items-center justify-center rounded-full opacity-50 md:flex"><Skip /></button>
        </div>
        <div className="hidden w-full max-w-[560px] items-center gap-2 text-[11px] tabular-nums text-faint md:flex" aria-hidden>
          <span className="w-8 text-right">0:00</span>
          <span className="h-1 flex-1 rounded-full bg-track" />
          <span className="w-8">{length}:00</span>
        </div>
      </div>
      <div className="hidden items-center justify-end gap-3 text-muted md:flex">
        <Soon />
        <button type="button" disabled aria-label="Playback speed" className="h-7 rounded-full px-2 text-[12px] font-semibold opacity-50">1×</button>
        <span className="flex items-center gap-2 opacity-50" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></svg>
          <span className="hidden h-1 w-16 rounded-full bg-track 2xl:block"><span className="block h-full w-3/4 rounded-full bg-faint/60" /></span>
        </span>
      </div>
    </section>
  );
}
