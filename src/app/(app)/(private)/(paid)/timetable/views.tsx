"use client";

import { useEffect, useRef, useState } from "react";
import { Btn, cardCls } from "@/components/ui";
import { EXAM_MINS, MAX_SESSION_MINS, MIN_SESSION_MINS, WEEKDAYS, addDays, daysBetween, toHhmm, toMins, weekday, type StoredSession } from "@/lib/timetable";
import { DRAG_EXAM, DRAG_SESSION, SNAP, colorOf, dayLabel, longDate, snap, startOfWeek, type Ctx } from "./shared";

const PX_PER_MIN = 0.8; // week view: an hour is 48px tall
const HOURS_COL = 52; // week view: width of the hour labels
const LIST_STEP = 14; // list view: days shown per "Show more"
const RED_BG = "rgba(255,59,48,0.12)";

const examsOn = (ctx: Ctx, date: string) => ctx.input.courses.filter((c) => c.examDate === date);
const nameOf = (ctx: Ctx, id: string) => ctx.input.courses.find((c) => c.id === id)?.name ?? "";
const dragIds = (e: React.DragEvent) => ({ session: e.dataTransfer.getData(DRAG_SESSION), exam: e.dataTransfer.getData(DRAG_EXAM) });
const draggable = (e: React.DragEvent) => e.dataTransfer.types.includes(DRAG_SESSION) || e.dataTransfer.types.includes(DRAG_EXAM);
/** A new event's default time on a day: the start of that weekday's first free time, else 18:00. */
const defaultStart = (ctx: Ctx, date: string) =>
  ctx.input.free.filter((b) => b.day === weekday(date)).map((b) => b.start).sort()[0] ?? "18:00";

export function MonthView({ ctx, cursor, onDay }: { ctx: Ctx; cursor: string; onDay: (d: string) => void }) {
  const start = startOfWeek(`${cursor.slice(0, 7)}-01`);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const [over, setOver] = useState<string | null>(null);
  return (
    <div className={`${cardCls} overflow-hidden`}>
      <div className="grid grid-cols-7 border-b border-edge/[0.08] text-center text-[11px] font-semibold uppercase text-muted">
        {WEEKDAYS.map((d) => <div key={d} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const mine = ctx.sessions.filter((s) => s.date === d);
          const outside = d.slice(0, 7) !== cursor.slice(0, 7);
          const s0 = defaultStart(ctx, d);
          return (
            <div
              key={d}
              role="button"
              tabIndex={0}
              aria-label={`Add to ${longDate(d)}`}
              onClick={() => ctx.open({ mode: "new", date: d, start: s0, end: toHhmm(Math.min(24 * 60, toMins(s0) + ctx.input.sessionMins)) })}
              onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) e.currentTarget.click(); }}
              onDragOver={(e) => { if (draggable(e)) { e.preventDefault(); setOver(d); } }}
              onDragLeave={() => setOver((o) => (o === d ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const { session, exam } = dragIds(e);
                const s = ctx.sessions.find((o) => o.id === session);
                if (s) ctx.moveSession(s, d, toMins(s.start));
                else if (exam) ctx.moveExam(exam, d);
              }}
              className={`flex min-h-[68px] min-w-0 cursor-pointer flex-col gap-0.5 border-b border-r border-edge/[0.06] p-1 outline-none hover:bg-fill/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue sm:min-h-[108px] [&:nth-child(7n)]:border-r-0 ${outside ? "bg-fill/40" : ""} ${over === d ? "!bg-blue/10" : ""}`}
            >
              <button type="button" onClick={(e) => { e.stopPropagation(); onDay(d); }} aria-label={`Open the week of ${longDate(d)}`}
                className={`flex size-6 items-center justify-center self-start rounded-full text-[12px] font-semibold hover:ring-1 hover:ring-blue ${d === ctx.today ? "bg-blue text-white" : outside ? "text-faint" : "text-ink"}`}>
                {Number(d.slice(8))}
              </button>
              {examsOn(ctx, d).map((c) => (
                <button key={c.id} type="button" draggable
                  onDragStart={(e) => { e.dataTransfer.setData(DRAG_EXAM, c.id); e.dataTransfer.effectAllowed = "move"; }}
                  onClick={(e) => { e.stopPropagation(); ctx.open({ mode: "exam", courseId: c.id }); }}
                  className="cursor-grabRef truncate rounded px-1 text-left text-[10px] font-semibold text-red sm:text-[11px]" style={{ background: RED_BG }}>
                  {c.name} exam
                </button>
              ))}
              {/* Phones: one dot per session; tapping the day number opens its week. */}
              <div className="flex flex-wrap gap-0.5 sm:hidden">
                {mine.map((s) => <span key={s.id} className="size-1.5 rounded-full" style={{ background: colorOf(ctx.input.courses, s.courseId) }} />)}
              </div>
              <div className="hidden flex-col gap-0.5 sm:flex">
                {mine.slice(0, 3).map((s) => (
                  <button key={s.id} type="button" draggable
                    onDragStart={(e) => { e.dataTransfer.setData(DRAG_SESSION, s.id); e.dataTransfer.effectAllowed = "move"; }}
                    onClick={(e) => { e.stopPropagation(); ctx.open({ mode: "session", session: s }); }}
                    className="flex min-w-0 cursor-grabRef items-center gap-1 rounded px-1 text-left text-[11px] hover:bg-fill active:cursor-grabbing">
                    <span className="size-1.5 shrink-0 rounded-full" style={{ background: colorOf(ctx.input.courses, s.courseId) }} aria-hidden />
                    <span className="shrink-0 tabular-nums text-muted">{s.start}</span>
                    <span className="truncate">{nameOf(ctx, s.courseId)}</span>
                  </button>
                ))}
                {mine.length > 3 && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); onDay(d); }} className="self-start px-1 text-[11px] font-medium text-blue">+{mine.length - 3} more</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Sel = { date: string; anchor: number; at: number };

/**
 * Week view: a time grid. With a mouse, drag over empty time to pick a span (a plain click picks an hour); on a
 * touch screen, tap. Either opens the new-event dialog. Sessions and exams drag to another day and time, and a
 * session's bottom edge drags to change its length. Weekly free time shows as a green band behind everything.
 */
export function WeekView({ ctx, start }: { ctx: Ctx; start: string }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const week = ctx.sessions.filter((s) => s.date >= days[0] && s.date <= days[6]);
  const examTimes = ctx.input.courses.filter((c) => c.examDate >= days[0] && c.examDate <= days[6] && c.examTime).map((c) => toMins(c.examTime));
  const starts = [...week.map((s) => toMins(s.start)), ...ctx.input.free.map((b) => toMins(b.start)), ...examTimes];
  const from = Math.floor(Math.min(6 * 60, ...starts) / 60) * 60;
  const to = 24 * 60;
  const height = (to - from) * PX_PER_MIN;
  const scroller = useRef<HTMLDivElement>(null);
  const grabRef = useRef(0); // minutes between a dragged block's top and where it was picked up
  const pointer = useRef("mouse");
  const resizingRef = useRef(false);
  const [sel, setSel] = useState<Sel | null>(null);
  const [resize, setResize] = useState<{ id: string; end: number } | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const minuteAt = (y: number, el: Element) => from + (y - el.getBoundingClientRect().top) / PX_PER_MIN;
  const first = Math.min(17 * 60, ...starts);

  // Open scrolled to today (phones show about three days) and to the first thing on the calendar this week.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const col = el.querySelector<HTMLElement>(`[data-day="${ctx.today}"]`);
    if (col) el.scrollLeft += col.getBoundingClientRect().left - el.getBoundingClientRect().left - HOURS_COL;
    el.scrollTop = Math.max(0, (first - from - 30) * PX_PER_MIN);
  }, [start]); // eslint-disable-line react-hooks/exhaustive-deps -- scroll only when the week changes, not on every edit

  /** The picked span, in minutes: from the press to the pointer, at least one snap long. */
  const span = (s: Sel) => {
    const [a, b] = s.at >= s.anchor ? [s.anchor, Math.max(s.anchor + SNAP, Math.ceil(s.at / SNAP) * SNAP)] : [Math.floor(s.at / SNAP) * SNAP, s.anchor + SNAP];
    return [Math.max(0, a), Math.min(to, b)];
  };
  const openNew = (date: string, a: number, b: number) => ctx.open({ mode: "new", date, start: toHhmm(a), end: toHhmm(b) });
  /** A tap or plain click: the half hour it landed in, for one session length. */
  const openAt = (date: string, m: number) => {
    const a = Math.min(to - ctx.input.sessionMins, Math.floor(m / 30) * 30);
    openNew(date, Math.max(0, a), Math.max(0, a) + ctx.input.sessionMins);
  };

  return (
    <div ref={scroller} className={`${cardCls} max-h-[72vh] select-none overflow-auto`}>
      <div className="grid min-w-[760px] grid-cols-[52px_repeat(7,minmax(0,1fr))]">
        <div className="sticky left-0 top-0 z-30 border-b border-edge/[0.08] bg-surface" />
        {days.map((d) => (
          <div key={d} data-day={d}
            onDragOver={(e) => { if (e.dataTransfer.types.includes(DRAG_EXAM)) e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); const { exam } = dragIds(e); if (exam) ctx.moveExam(exam, d); }}
            className="sticky top-0 z-20 flex min-w-0 flex-col gap-1 border-b border-l border-edge/[0.08] bg-surface p-2">
            <span className={`text-[12px] font-semibold ${d === ctx.today ? "text-blue" : ""}`}>{dayLabel(d)}</span>
            {examsOn(ctx, d).filter((c) => !c.examTime).map((c) => (
              <button key={c.id} type="button" draggable
                onDragStart={(e) => { grabRef.current = 0; e.dataTransfer.setData(DRAG_EXAM, c.id); }}
                onClick={() => ctx.open({ mode: "exam", courseId: c.id })}
                className="cursor-grabRef truncate rounded px-1.5 py-0.5 text-left text-[11px] font-semibold text-red" style={{ background: RED_BG }} title={`${c.name} exam`}>
                {c.name} exam
              </button>
            ))}
          </div>
        ))}
        <div className="sticky left-0 z-10 bg-surface" style={{ height }}>
          {Array.from({ length: (to - from) / 60 }, (_, i) => (
            <span key={i} className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-faint first:translate-y-0" style={{ top: i * 60 * PX_PER_MIN }}>{toHhmm(from + i * 60)}</span>
          ))}
        </div>
        {days.map((d) => {
          const free = ctx.input.free.filter((b) => b.day === weekday(d));
          const s = sel?.date === d ? span(sel) : null;
          return (
            <div
              key={d}
              data-col
              onPointerDown={(e) => {
                pointer.current = e.pointerType;
                if (e.pointerType === "touch" || e.button !== 0) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                const m = Math.floor(minuteAt(e.clientY, e.currentTarget) / SNAP) * SNAP;
                setSel({ date: d, anchor: m, at: m });
              }}
              onPointerMove={(e) => { if (sel?.date === d) setSel({ ...sel, at: minuteAt(e.clientY, e.currentTarget) }); }}
              onPointerUp={() => {
                if (!sel || sel.date !== d) return;
                const [a, b] = span(sel);
                setSel(null);
                if (b - a <= SNAP) openAt(d, sel.anchor);
                else openNew(d, a, b);
              }}
              onPointerCancel={() => setSel(null)}
              onClick={(e) => { if (pointer.current === "touch") openAt(d, minuteAt(e.clientY, e.currentTarget)); }}
              onDragOver={(e) => { if (draggable(e)) { e.preventDefault(); setOver(d); } }}
              onDragLeave={() => setOver((o) => (o === d ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const m = snap(minuteAt(e.clientY, e.currentTarget) - grabRef.current);
                const { session, exam } = dragIds(e);
                const moved = ctx.sessions.find((o) => o.id === session);
                if (moved) ctx.moveSession(moved, d, m);
                else if (exam) ctx.moveExam(exam, d, toHhmm(Math.max(0, Math.min(to - SNAP, m))));
              }}
              className={`relative cursor-cell border-l border-edge/[0.08] ${d === ctx.today ? "bg-blue/[0.03]" : ""} ${over === d ? "bg-blue/10" : ""}`}
              style={{ height, backgroundImage: `repeating-linear-gradient(to bottom, var(--hairline) 0 1px, transparent 1px ${60 * PX_PER_MIN}px)` }}
            >
              {free.map((b) => (
                <div key={b.id} className="pointer-events-none absolute inset-x-0 bg-green/[0.14]"
                  style={{ top: (toMins(b.start) - from) * PX_PER_MIN, height: (toMins(b.end) - toMins(b.start)) * PX_PER_MIN }}>
                  {/* Sessions leave the right edge clear, so this strip always shows and can be tapped. */}
                  <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); ctx.open({ mode: "free", block: b }); }}
                    className="pointer-events-auto absolute inset-y-0 right-0 w-2.5 rounded-l bg-green/70 hover:bg-green" title={`Free time ${b.start}–${b.end}, every week`} aria-label={`Change free time ${b.start} to ${b.end}`} />
                  <span className="absolute left-1 top-0.5 text-[10px] font-semibold text-green">Free {b.start}–{b.end}</span>
                </div>
              ))}
              {examsOn(ctx, d).filter((c) => c.examTime).map((c) => {
                const top = (toMins(c.examTime) - from) * PX_PER_MIN;
                return (
                  <button key={c.id} type="button" draggable
                    onPointerDown={(e) => e.stopPropagation()}
                    onDragStart={(e) => { grabRef.current = (e.clientY - e.currentTarget.getBoundingClientRect().top) / PX_PER_MIN; e.dataTransfer.setData(DRAG_EXAM, c.id); e.dataTransfer.effectAllowed = "move"; }}
                    onClick={(e) => { e.stopPropagation(); ctx.open({ mode: "exam", courseId: c.id }); }}
                    className="absolute left-1 right-3.5 z-[5] flex cursor-grabRef flex-col overflow-hidden rounded-md border-l-[3px] border-red px-1.5 py-1 text-left text-[11px] leading-tight text-red"
                    style={{ top: top + 1, height: Math.min(EXAM_MINS * PX_PER_MIN, height - top) - 2, background: RED_BG }}>
                    <span className="flex h-full w-full flex-col overflow-hidden">
                      <span className="truncate font-bold">{c.name} exam</span>
                      <span className="tabular-nums">{c.examTime}</span>
                    </span>
                  </button>
                );
              })}
              {week.filter((x) => x.date === d).map((x) => <SessionBlock key={x.id} ctx={ctx} s={x} from={from} grabRef={grabRef} resizingRef={resizingRef} resize={resize} setResize={setResize} minuteAt={minuteAt} />)}
              {s && (
                <div className="pointer-events-none absolute inset-x-1 z-20 rounded-md bg-blue/20 px-1.5 py-1 text-[11px] font-semibold tabular-nums text-blue ring-1 ring-blue"
                  style={{ top: (s[0] - from) * PX_PER_MIN, height: (s[1] - s[0]) * PX_PER_MIN }}>
                  {toHhmm(s[0])}–{toHhmm(s[1])}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SessionBlock({ ctx, s, from, grabRef, resizingRef, resize, setResize, minuteAt }: {
  ctx: Ctx;
  s: StoredSession;
  from: number;
  grabRef: React.RefObject<number>;
  resizingRef: React.RefObject<boolean>;
  resize: { id: string; end: number } | null;
  setResize: (r: { id: string; end: number } | null) => void;
  minuteAt: (y: number, el: Element) => number;
}) {
  const start = toMins(s.start);
  const end = resize?.id === s.id ? resize.end : toMins(s.end);
  const h = (end - start) * PX_PER_MIN;
  const c = colorOf(ctx.input.courses, s.courseId);
  return (
    <button
      type="button"
      draggable
      onPointerDown={(e) => e.stopPropagation()}
      onDragStart={(e) => {
        if (resizingRef.current) return e.preventDefault();
        grabRef.current = (e.clientY - e.currentTarget.getBoundingClientRect().top) / PX_PER_MIN;
        e.dataTransfer.setData(DRAG_SESSION, s.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={(e) => { e.stopPropagation(); if (!resizingRef.current) ctx.open({ mode: "session", session: s }); }}
      className="group absolute left-1 right-3.5 z-10 flex cursor-grabRef flex-col overflow-hidden rounded-md px-1.5 py-1 text-left text-[11px] leading-tight text-ink active:cursor-grabbing"
      style={{ top: (start - from) * PX_PER_MIN + 1, height: h - 2, background: `color-mix(in srgb, ${c} 18%, var(--surface))`, borderLeft: `3px solid ${c}` }}
    >
      {/* A wrapper, because a button centres overflowing content and would clip the course name off the top. */}
      <span className="flex h-full w-full flex-col overflow-hidden">
        <span className="truncate font-semibold">{nameOf(ctx, s.courseId)}</span>
        {h >= 30 && <span className="truncate tabular-nums text-muted">{s.start}–{toHhmm(end)}</span>}
        {s.review && h >= 44 && <span className="truncate font-semibold text-muted">Final review</span>}
      </span>
      {/* Bottom edge: drag to change the length. */}
      <span
        aria-hidden
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          resizingRef.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          setResize({ id: s.id, end: toMins(s.end) });
        }}
        onPointerMove={(e) => {
          if (resize?.id !== s.id) return;
          const col = e.currentTarget.closest("[data-col]");
          if (!col) return;
          const m = snap(minuteAt(e.clientY, col));
          setResize({ id: s.id, end: Math.max(start + MIN_SESSION_MINS, Math.min(start + MAX_SESSION_MINS, 24 * 60, m)) });
        }}
        onPointerUp={() => {
          const r = resize;
          setResize(null);
          if (r?.id === s.id) ctx.moveSession(s, s.date, start, r.end);
          setTimeout(() => { resizingRef.current = false; }, 0); // after the click that follows this pointerup
        }}
        className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize touch-none opacity-0 group-hover:bg-ink/10 group-hover:opacity-100"
      />
    </button>
  );
}

export function ListView({ ctx }: { ctx: Ctx }) {
  const [shown, setShown] = useState(LIST_STEP);
  const last = [...ctx.sessions.map((s) => s.date), ...ctx.input.courses.map((c) => c.examDate).filter(Boolean)].reduce((m, d) => (d > m ? d : m), ctx.today);
  const days = Array.from({ length: daysBetween(ctx.today, last) + 1 }, (_, i) => addDays(ctx.today, i));
  return (
    <div className="flex flex-col gap-3">
      {days.slice(0, shown).map((d) => {
        const mine = ctx.sessions.filter((s) => s.date === d);
        const exams = examsOn(ctx, d);
        return (
          <div key={d} className={`${cardCls} flex flex-col gap-2 p-4`}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[15px] font-semibold">{d === ctx.today ? `Today · ${dayLabel(d)}` : dayLabel(d)}</span>
              <button type="button" onClick={() => { const s0 = defaultStart(ctx, d); ctx.open({ mode: "new", date: d, start: s0, end: toHhmm(Math.min(24 * 60, toMins(s0) + ctx.input.sessionMins)) }); }}
                className="h-7 rounded-md px-2 text-[13px] font-medium text-blue hover:bg-fill" aria-label={`Add to ${longDate(d)}`}>+ Add</button>
            </div>
            {exams.map((c) => (
              <button key={c.id} type="button" onClick={() => ctx.open({ mode: "exam", courseId: c.id })} className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px]" style={{ background: RED_BG }}>
                <span className="w-[92px] shrink-0 text-xs font-semibold text-red">{c.examTime || "Exam day"}</span>
                <span className="font-semibold">{c.name} exam</span>
              </button>
            ))}
            {mine.map((s) => (
              <button key={s.id} type="button" onClick={() => ctx.open({ mode: "session", session: s })} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-1 text-left text-[14px] hover:bg-fill">
                <span className="w-[92px] shrink-0 text-xs tabular-nums text-muted">{s.start}–{s.end}</span>
                <span className="size-2 shrink-0 rounded-full" style={{ background: colorOf(ctx.input.courses, s.courseId) }} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{nameOf(ctx, s.courseId)}</span>
                {s.review && <span className="shrink-0 rounded-md bg-fill px-2 py-0.5 text-[11px] font-semibold text-muted">Final review</span>}
              </button>
            ))}
            {!exams.length && !mine.length && <span className="text-[13px] text-muted">Nothing planned</span>}
          </div>
        );
      })}
      {shown < days.length && (
        <div><Btn tone="plain" onClick={() => setShown((n) => n + LIST_STEP)}>Show the next {Math.min(LIST_STEP, days.length - shown)} days</Btn></div>
      )}
    </div>
  );
}
