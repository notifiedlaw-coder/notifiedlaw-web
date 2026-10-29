"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Btn, Gate } from "@/components/ui";
import { Markdown, splitChapters } from "@/components/markdown";
import type { TopicNote } from "@/lib/notes";
import { AddNoteButton, Composer, ComposerSheet, NotesPanel, findPassage, paint, passageOf, textMap, useTopicNotes, type Draft } from "./notes";

const SERIF = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";
const WIDE = "(min-width: 1280px)"; // Tailwind's xl, where the side panel shows

/**
 * A topic written in Notion (Markdown). Each "##" heading starts a chapter. Beside it on wide screens is My Notes,
 * where a highlighted passage can be given a note saved to the reader's account, then the AI Summary (coming
 * soon); on narrow screens the notes follow the text. At the bottom is a podcast player for the topic (coming soon).
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
  const [viewH, setViewH] = useState(0);
  const ranges = useRef(new Map<string, Range>());
  const reveal = useRef<string | null>(null);
  const [jump, setJump] = useState(0);

  useEffect(() => {
    const m = matchMedia(WIDE);
    const on = () => setWide(m.matches);
    on();
    m.addEventListener("change", on);
    const el = scroller.current;
    const ro = el ? new ResizeObserver(() => setViewH(el.clientHeight)) : null;
    if (el) ro!.observe(el);
    return () => { m.removeEventListener("change", on); ro?.disconnect(); };
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
    if (p) { setDraft({ chapter: cur, ...p }); setActive(null); }
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
    if (x.chapter !== cur && x.chapter < total) go(x.chapter);
  };
  // Clicking a marked passage picks its note in the panel.
  const onTextClick = () => {
    const sel = getSelection();
    if (!sel?.isCollapsed || !sel.anchorNode) return;
    const hit = [...ranges.current].find(([, r]) => r.isPointInRange(sel.anchorNode!, sel.anchorOffset));
    setActive(hit?.[0] ?? null);
    if (hit) document.getElementById(`note-${hit[0]}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const save = async (note: string) => {
    if (!draft) return null;
    const err = await notes.add({ chapter: draft.chapter, quote: draft.quote, before: draft.before }, note);
    if (!err) setDraft(null);
    return err;
  };
  const composer = draft && <Composer draft={draft} signedOut={notes.status === "signedOut"} onSave={save} onCancel={() => setDraft(null)} />;
  const panel = (inAside: boolean) => (
    <NotesPanel status={notes.status} notes={notes.notes} chapters={chapters.map((c) => c.title)} cur={cur} active={active} missing={missing}
      composer={inAside ? composer : null} className={inAside ? "min-h-0" : ""} onOpen={open} onEdit={notes.edit} onDelete={notes.remove} />
  );

  return (
    <div className="relative flex h-full">
      {lock === "Pro Max" && <Gate title="Pre-Bar and Bar Course come with Supreme Justice (Max)" body="Upgrade to read every note." cta="Unlock with Supreme Justice (Max)" color="#AF52DE" />}
      {lock === "Student" && <Gate title="Choose a plan to keep reading" body="The first two topics of every course are open as a preview. Student unlocks every topic from Level 100 to 400." cta="See plans" />}
      <div ref={scroller} className="min-w-0 flex-1 overflow-auto bg-surface">
        <div className="mx-auto flex max-w-[1100px] justify-center gap-10 px-5 md:px-8">
        <article className="min-w-0 max-w-[720px] flex-1 py-8 md:py-10" style={{ fontFamily: SERIF, fontSize: 18, lineHeight: 1.65 }}>
          <div className="text-xs font-bold uppercase tracking-[0.05em] text-muted" style={{ fontFamily: "var(--font-sans)" }}>
            {course} · Topic {n}{total > 1 ? ` · Chapter ${cur + 1} of ${total}` : ""}
          </div>
          <h1 className="mb-2 mt-2.5 text-[28px] font-bold leading-tight tracking-[-0.01em] md:text-4xl">{title}</h1>
          <div className="mb-5 text-[13px] text-muted" style={{ fontFamily: "var(--font-sans)" }}>
            {total} {total === 1 ? "chapter" : "chapters"} · {minutes} min read
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
          <div className="mb-6 xl:hidden"><Summary /></div>
          {total > 1 && <h2 className="mb-2.5 mt-7 text-[26px] font-bold tracking-[-0.01em]">{ch.title}</h2>}
          <div ref={text} onClick={topicId ? onTextClick : undefined}>{md}</div>
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-edge/10 pt-5" style={{ fontFamily: "var(--font-sans)", fontSize: 14 }}>
            {cur > 0 ? <button onClick={() => go(cur - 1)} className="h-10 rounded-[10px] bg-fill px-4 text-[14px] font-semibold">Previous chapter</button> : <span />}
            {last ? <Btn href={`/library/${slug}`}>Back to course</Btn> : <button onClick={() => go(cur + 1)} className="flex h-10 items-center gap-1.5 rounded-[10px] bg-blue px-4 text-[14px] font-semibold text-white">Next chapter<Icon name="back" size={12} className="rotate-180" /></button>}
          </div>
          {topicId && !wide && <div className="mt-8">{panel(false)}</div>}
          <Podcast title={title} minutes={minutes} />
        </article>
        <aside className="hidden w-[300px] shrink-0 xl:block" aria-label="My Notes and AI Summary">
          <div className="sticky top-0 flex flex-col gap-4 py-10" style={viewH ? { maxHeight: viewH } : undefined}>
            {topicId && wide && panel(true)}
            <div className="shrink-0"><Summary /></div>
          </div>
        </aside>
        </div>
      </div>
      {pick && <AddNoteButton rect={pick} onAdd={startNote} />}
      {draft && !wide && <ComposerSheet onClose={() => setDraft(null)}>{composer}</ComposerSheet>}
    </div>
  );
}

const SANS = { fontFamily: "var(--font-sans)" };
// Orange mixed toward the ink colour, so the label reads in both light and dark themes.
const Soon = () => <span className="shrink-0 rounded-full bg-[#FF9500]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em]" style={{ color: "color-mix(in srgb, #FF9500 62%, var(--ink))" }}>Coming soon</span>;

/** The AI Summary of a topic: the key rules and cases in a minute's read. Not built yet, so it shows its shape. */
function Summary() {
  return (
    <section className="flex flex-col gap-3 rounded-[18px] bg-fill p-4" style={SANS} aria-label="AI Summary, coming soon">
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

/** A podcast of the topic, pinned to the bottom of the page while reading. Not built yet, so its controls are off. */
function Podcast({ title, minutes }: { title: string; minutes: number }) {
  const length = Math.max(3, Math.round(minutes * 0.6));
  return (
    <section className="sticky bottom-4 z-10 mt-8 flex items-center gap-3 rounded-[18px] bg-surface/85 p-2.5 pr-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.12),0_0_0_0.5px_var(--hairline)] backdrop-blur-xl" style={SANS} aria-label="Topic podcast, coming soon">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#D06BFF] to-[#5856D6] text-white shadow-[0_2px_8px_rgba(88,86,214,0.35)]" aria-hidden><Icon name="headphones" size={22} /></span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[14px] font-semibold">Listen to this topic</span>
          <Soon />
        </div>
        <span className="truncate text-[12px] text-muted">AI podcast · about {length} min · {title}</span>
        <div className="hidden items-center gap-2 text-[11px] tabular-nums text-faint sm:flex" aria-hidden>
          <span>0:00</span>
          <span className="h-1 flex-1 rounded-full bg-track" />
          <span>{length}:00</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 text-muted">
        <button type="button" disabled aria-label="Back 15 seconds" className="hidden size-9 items-center justify-center rounded-full opacity-50 sm:flex">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" /><text x="12" y="15.5" fontSize="7" fontWeight="700" textAnchor="middle" fill="currentColor" stroke="none">15</text></svg>
        </button>
        <button type="button" disabled aria-label="Play, coming soon" className="flex size-11 items-center justify-center rounded-full bg-fill text-faint">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" /></svg>
        </button>
        <button type="button" disabled aria-label="Forward 30 seconds" className="hidden size-9 items-center justify-center rounded-full opacity-50 sm:flex">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" /><text x="12" y="15.5" fontSize="7" fontWeight="700" textAnchor="middle" fill="currentColor" stroke="none">30</text></svg>
        </button>
      </div>
    </section>
  );
}
