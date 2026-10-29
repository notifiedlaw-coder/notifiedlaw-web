"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Btn, Gate } from "@/components/ui";
import { Markdown, splitChapters } from "@/components/markdown";
import type { TopicNote } from "@/lib/notes";
import { AddNoteButton, Composer, NotesPanel, findPassage, paint, passageOf, textMap, useTopicNotes, type Draft } from "./notes";

const SERIF = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";
const WIDE = "(min-width: 1280px)"; // Tailwind's xl, where the sidebar stays open
type Tab = "summary" | "notes";

/**
 * A topic written in Notion (Markdown). Each "##" heading starts a chapter. On the right is a sidebar with two tabs:
 * the AI Summary (coming soon) and Notes, where a highlighted passage can be given a note saved to the reader's
 * account. Wide screens keep the sidebar open; narrower ones slide it in. Along the bottom, between the app's
 * sidebar and this one, is a player bar for the topic's podcast (coming soon).
 */
export function Reader({ course, slug, n, title, lock = null, body, topicId = null }: { course: string; slug: string; n: number; title: string; lock?: "Student" | "Pro Max" | null; body: string; topicId?: string | null }) {
  const [cur, setCur] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);

  const chapters = useMemo(() => splitChapters(body, title), [body, title]);
  const total = chapters.length;
  const ch = chapters[cur];
  const minutes = Math.max(1, Math.round(body.split(/\s+/).length / 200));
  const last = cur === total - 1;
  const go = (i: number) => {
    setCur(i);
    setDraft(null);
    setActive(null);
    scroller.current?.scrollTo({ top: 0 });
  };
  // Parsed once per chapter, so selecting text (which re-renders) leaves the text's DOM, and the selection, alone.
  const md = useMemo(() => <Markdown source={ch.md} from={total > 1 ? 3 : 2} />, [ch.md, total]);

  // ---- notes
  const notes = useTopicNotes(topicId);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pick, setPick] = useState<DOMRect | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [wide, setWide] = useState(false);
  const ranges = useRef(new Map<string, Range>());
  const reveal = useRef<string | null>(null);
  const [jump, setJump] = useState(0);

  // ---- sidebar
  const [tab, setTab] = useState<Tab>("notes");
  const [drawer, setDrawer] = useState(false);
  const showNotes = () => { setTab("notes"); if (!wide) setDrawer(true); };
  const closeDrawer = () => { setDrawer(false); setDraft(null); };

  useEffect(() => {
    const m = matchMedia(WIDE);
    const on = () => { setWide(m.matches); if (m.matches) setDrawer(false); };
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);

  // The "Add note" pill follows a selection made inside the text.
  useEffect(() => {
    if (!topicId) return;
    let frame = 0;
    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const sel = getSelection();
        const r = sel && sel.rangeCount && !sel.isCollapsed ? sel.getRangeAt(0) : null;
        setPick(r && text.current?.contains(r.commonAncestorContainer) && r.toString().trim().length > 1 ? r.getBoundingClientRect() : null);
      });
    };
    document.addEventListener("selectionchange", check);
    const el = scroller.current;
    el?.addEventListener("scroll", check, { passive: true });
    return () => { cancelAnimationFrame(frame); document.removeEventListener("selectionchange", check); el?.removeEventListener("scroll", check); };
  }, [topicId]);

  const startNote = () => {
    const sel = getSelection();
    if (!text.current || !sel?.rangeCount) return;
    const p = passageOf(textMap(text.current), sel.getRangeAt(0));
    sel.removeAllRanges();
    setPick(null);
    if (p) { setDraft({ chapter: cur, ...p }); setActive(null); showNotes(); }
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
    paint("nl-note", [...found.values()]);
    paint("nl-note-active", active && found.has(active) ? [found.get(active)!] : draft ? [draft.range] : []);
    const want = reveal.current;
    if (want && found.has(want)) {
      reveal.current = null;
      const box = scroller.current!.getBoundingClientRect();
      scroller.current!.scrollBy({ top: found.get(want)!.getBoundingClientRect().top - box.top - box.height / 3, behavior: "smooth" });
    }
  }, [notes.notes, cur, md, active, draft, jump]);
  useEffect(() => () => { paint("nl-note", []); paint("nl-note-active", []); }, []);

  // Picking a note scrolls its passage into view, opening its chapter first if need be.
  const open = (x: TopicNote) => {
    setActive(x.id);
    setDraft(null);
    reveal.current = x.id;
    setJump((j) => j + 1);
    setDrawer(false);
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
    const err = await notes.add({ chapter: draft.chapter, quote: draft.quote, before: draft.before }, note);
    if (!err) setDraft(null);
    return err;
  };
  const composer = draft && <Composer draft={draft} signedOut={notes.status === "signedOut"} onSave={save} onCancel={() => setDraft(null)} />;
  const sidebar = (
    <Sidebar tab={tab} onTab={setTab} count={notes.notes.length} onClose={wide ? undefined : closeDrawer}>
      {tab === "summary" ? <Summary /> : topicId ? (
        <NotesPanel status={notes.status} notes={notes.notes} chapters={chapters.map((c) => c.title)} cur={cur} active={active} missing={missing}
          composer={composer} onOpen={open} onEdit={notes.edit} onDelete={notes.remove} />
      ) : <p className="m-0 text-[13px] leading-snug text-muted" style={SANS}>Notes open once you can read this topic.</p>}
    </Sidebar>
  );

  return (
    <div className="relative flex h-full">
      {lock === "Pro Max" && <Gate title="Pre-Bar and Bar Course come with Supreme Justice (Max)" body="Upgrade to read every note." cta="Unlock with Supreme Justice (Max)" color="#AF52DE" />}
      {lock === "Student" && <Gate title="Choose a plan to keep reading" body="The first two topics of every course are open as a preview. Student unlocks every topic from Level 100 to 400." cta="See plans" />}
      <div className="flex min-w-0 flex-1 flex-col">
      <div ref={scroller} className="min-h-0 flex-1 overflow-auto bg-surface">
        <div className="mx-auto flex max-w-[1100px] justify-center px-5 md:px-8">
        <article className="min-w-0 max-w-[720px] flex-1 py-8 md:py-10" style={{ fontFamily: SERIF, fontSize: 18, lineHeight: 1.65 }}>
          <div className="text-xs font-bold uppercase tracking-[0.05em] text-muted" style={{ fontFamily: "var(--font-sans)" }}>
            {course} · Topic {n}{total > 1 ? ` · Chapter ${cur + 1} of ${total}` : ""}
          </div>
          <h1 className="mb-2 mt-2.5 text-[28px] font-bold leading-tight tracking-[-0.01em] md:text-4xl">{title}</h1>
          <div className="mb-5 flex items-center gap-3 text-[13px] text-muted" style={{ fontFamily: "var(--font-sans)" }}>
            <span className="flex-1">{total} {total === 1 ? "chapter" : "chapters"} · {minutes} min read</span>
            {!wide && (
              <button type="button" onClick={() => setDrawer(true)} aria-label="Open AI Summary and Notes" aria-expanded={drawer}
                className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-fill px-3 text-[13px] font-semibold text-ink">
                <Icon name="sidebar" size={14} />Summary &amp; Notes
                {notes.notes.length > 0 && <span className="rounded-full bg-surface px-1.5 text-[11px] tabular-nums text-muted">{notes.notes.length}</span>}
              </button>
            )}
          </div>
          {total > 1 && (
            <div className="mb-6 flex flex-wrap gap-2" style={{ fontFamily: "var(--font-sans)" }}>
              {chapters.map((c, i) => (
                <button key={c.title + i} onClick={() => go(i)} aria-current={i === cur ? "step" : undefined}
                  className="flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-left"
                  style={{ background: i === cur ? "#0066CC" : "var(--fill)", color: i === cur ? "#fff" : "var(--ink)" }}>
                  <span className="flex size-6 items-center justify-center rounded-full text-xs font-bold" style={{ background: i === cur ? "#fff" : "var(--surface)", color: i === cur ? "#1d1d1f" : "var(--muted)" }}>{i + 1}</span>
                  <span className="text-[13px] font-semibold">{c.title}</span>
                </button>
              ))}
            </div>
          )}
          {total > 1 && <h2 className="mb-2.5 mt-7 text-[26px] font-bold tracking-[-0.01em]">{ch.title}</h2>}
          {/* Selectable so passages can be highlighted for notes; CopyGuard still blocks copy, cut, drag and right-click. */}
          <div ref={text} onClick={topicId ? onTextClick : undefined} className={topicId ? "nl-selectable" : undefined}>{md}</div>
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-edge/10 pt-5" style={{ fontFamily: "var(--font-sans)", fontSize: 14 }}>
            {cur > 0 ? <button onClick={() => go(cur - 1)} className="h-10 rounded-[10px] bg-fill px-4 text-[14px] font-semibold">Previous chapter</button> : <span />}
            {last ? <Btn href={`/library/${slug}`}>Back to course</Btn> : <button onClick={() => go(cur + 1)} className="flex h-10 items-center gap-1.5 rounded-[10px] bg-blue px-4 text-[14px] font-semibold text-white">Next chapter<Icon name="back" size={12} className="rotate-180" /></button>}
          </div>
        </article>
        </div>
      </div>
      <Podcast title={title} minutes={minutes} />
      </div>
      {wide && <aside className="flex w-[340px] shrink-0 flex-col border-l border-edge/10 bg-fill/50" aria-label="AI Summary and Notes">{sidebar}</aside>}
      {drawer && !wide && <Drawer onClose={closeDrawer}>{sidebar}</Drawer>}
      {pick && <AddNoteButton rect={pick} onAdd={startNote} />}
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
          <button type="button" onClick={onClose} aria-label="Close sidebar" className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-track/70 hover:text-ink">
            <Icon name="close" size={14} />
          </button>
        )}
      </div>
      <div id="sidebar-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-1">{children}</div>
    </>
  );
}

/** The sidebar sliding in from the right, for screens too narrow to keep it open. */
function Drawer({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-black/30 animate-[tt-fade_160ms_ease-out]" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="AI Summary and Notes"
        className="absolute inset-y-0 right-0 flex w-[min(380px,calc(100vw-40px))] flex-col bg-fill pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] shadow-[-10px_0_40px_rgba(0,0,0,0.2)] animate-[nl-drawer_240ms_cubic-bezier(0.2,0.9,0.3,1)]">
        {children}
      </div>
    </div>
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
