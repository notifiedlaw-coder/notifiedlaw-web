"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Btn, cardCls } from "@/components/ui";
import { EXAM_MINS, MAX_SESSION_MINS, MIN_SESSION_MINS, WEEKDAYS, addDays, daysBetween, toHhmm, toMins, weekday, type StoredSession, type TimetableCourse } from "@/lib/timetable";
import {
  DRAG_EXAM, DRAG_SESSION, EXAM_COLOR, FREE_COLOR, SNAP, anchorOf, colorOf, dayLabel, fmt, lanes, longDate, snap, startOfWeek, tint, useMedia,
  type Anchor, type Ctx,
} from "./shared";

const MOBILE_PX_PER_MIN = 0.8; // phones scroll the day; an hour is 48px
const MIN_FIT_PX_PER_MIN = 0.5; // desktop fits the day to the screen, but no tighter than 30px an hour
// Hour labels, then the seven days. Phones get a narrower label column so the whole week fits the screen.
const GRID_COLS = "grid-cols-[52px_repeat(7,minmax(0,1fr))]";
const GRID_COLS_MOBILE = "grid-cols-[36px_repeat(7,minmax(0,1fr))]";
const LIST_STEP = 14; // list view: days shown per "Show more"
const HOLD_MS = 350; // touch: press and hold this long to pick an event up

const nameOf = (ctx: Ctx, id: string) => ctx.input.courses.find((c) => c.id === id)?.name ?? "";
const shownSessions = (ctx: Ctx) => ctx.sessions.filter((s) => !ctx.hidden.has(s.courseId));
const examsOn = (ctx: Ctx, date: string) => ctx.input.courses.filter((c) => c.examDate === date && !ctx.hidden.has(c.id));
/** A new event's default time on a day: the start of that weekday's first free time, else 18:00. */
const defaultStart = (ctx: Ctx, date: string) => ctx.input.free.filter((b) => b.day === weekday(date)).map((b) => b.start).sort()[0] ?? "18:00";
const openNewOn = (ctx: Ctx, date: string, anchor: Anchor) => {
  const s0 = defaultStart(ctx, date);
  ctx.open({ mode: "new", date, start: s0, end: toHhmm(Math.min(24 * 60, toMins(s0) + ctx.input.sessionMins)) }, anchor);
};
const hourLabel = (m: number) => toHhmm(m % (24 * 60));

/** The current time of day in minutes (Accra is UTC), refreshed every minute; null until mounted, so the server and browser render alike. */
function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => { const d = new Date(); setNow(d.getUTCHours() * 60 + d.getUTCMinutes()); };
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function DayNumber({ date, today, big }: { date: string; today: string; big?: boolean }) {
  const n = Number(date.slice(8));
  const size = big ? "size-7 text-[17px]" : "size-6 text-[12px]";
  return date === today
    ? <span className={`flex ${size} items-center justify-center rounded-full bg-red font-semibold text-white`}>{n}</span>
    : <span className={`flex ${size} items-center justify-center font-semibold`}>{n}</span>;
}

export function MiniMonth({ cursor, today, marked, onPick }: { cursor: string; today: string; marked: Set<string>; onPick: (d: string) => void }) {
  const [month, setMonth] = useState(cursor.slice(0, 7));
  const [seen, setSeen] = useState(cursor);
  // Follow the main calendar when it moves to another month.
  if (seen !== cursor) { setSeen(cursor); setMonth(cursor.slice(0, 7)); }
  const start = startOfWeek(`${month}-01`);
  const week = startOfWeek(cursor);
  const shift = (n: number) => { const d = new Date(Date.parse(`${month}-01`)); d.setUTCMonth(d.getUTCMonth() + n); setMonth(d.toISOString().slice(0, 7)); };
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-[13px] font-semibold">{fmt(`${month}-01`, { month: "long", year: "numeric" })}</span>
        <span className="flex">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="flex size-6 items-center justify-center rounded-md text-[15px] text-muted hover:bg-fill">‹</button>
          <button type="button" onClick={() => shift(1)} aria-label="Next month" className="flex size-6 items-center justify-center rounded-md text-[15px] text-muted hover:bg-fill">›</button>
        </span>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-faint">{WEEKDAYS.map((d) => <span key={d}>{d[0]}</span>)}</div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: 42 }, (_, i) => addDays(start, i)).map((d) => {
          const inWeek = d >= week && d <= addDays(week, 6);
          return (
            <button key={d} type="button" onClick={() => onPick(d)} aria-label={longDate(d)}
              className={`relative flex h-7 items-center justify-center text-[11px] ${inWeek ? "bg-fill [&:nth-child(7n+1)]:rounded-l-md [&:nth-child(7n)]:rounded-r-md" : ""} ${d.slice(0, 7) !== month ? "text-faint/60" : ""}`}>
              <span className={`flex size-6 items-center justify-center rounded-full ${d === today ? "bg-red font-semibold text-white" : "hover:bg-track"}`}>{Number(d.slice(8))}</span>
              {marked.has(d) && d !== today && <span className="absolute bottom-0.5 size-1 rounded-full bg-muted/60" aria-hidden />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Month view: a grid of the whole month. Tap a day to add to it, drag events between days, tap an event to open it. */
export function MonthView({ ctx, cursor, onDay }: { ctx: Ctx; cursor: string; onDay: (d: string) => void }) {
  const start = startOfWeek(`${cursor.slice(0, 7)}-01`);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const [over, setOver] = useState<string | null>(null);
  const sessions = shownSessions(ctx);
  const selected = ctx.active?.mode === "session" ? ctx.active.session.id : ctx.active?.mode === "exam" ? ctx.active.courseId : null;
  return (
    // nl-type-fixed: the calendar grids keep their compact sizes on phones; see globals.css.
    <div className={`${cardCls} nl-type-fixed flex min-h-0 flex-1 flex-col overflow-hidden`}>
      <div className="grid grid-cols-7 border-b border-edge/[0.08] text-right text-[11px] font-semibold uppercase tracking-wide text-muted">
        {WEEKDAYS.map((d) => <div key={d} className="px-2 py-1.5">{d}</div>)}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
        {days.map((d) => {
          const mine = sessions.filter((s) => s.date === d);
          const exams = examsOn(ctx, d);
          const outside = d.slice(0, 7) !== cursor.slice(0, 7);
          const shown = Math.max(0, 3 - exams.length);
          return (
            <div
              key={d}
              role="button"
              tabIndex={0}
              aria-label={`Add to ${longDate(d)}`}
              onClick={(e) => openNewOn(ctx, d, anchorOf(e.currentTarget))}
              onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) openNewOn(ctx, d, anchorOf(e.currentTarget)); }}
              onDragOver={(e) => { if (e.dataTransfer.types.includes(DRAG_SESSION) || e.dataTransfer.types.includes(DRAG_EXAM)) { e.preventDefault(); setOver(d); } }}
              onDragLeave={() => setOver((o) => (o === d ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const s = ctx.sessions.find((o) => o.id === e.dataTransfer.getData(DRAG_SESSION));
                const exam = e.dataTransfer.getData(DRAG_EXAM);
                if (s) ctx.moveSession(s, d, toMins(s.start));
                else if (exam) ctx.moveExam(exam, d);
              }}
              className={`flex min-h-[64px] min-w-0 cursor-default flex-col gap-px overflow-hidden border-b border-r border-edge/[0.06] p-1 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue [&:nth-child(7n)]:border-r-0 ${outside ? "bg-canvas/60 text-faint" : ""} ${over === d ? "!bg-blue/10" : ""}`}
            >
              <button type="button" onClick={(e) => { e.stopPropagation(); onDay(d); }} aria-label={`Open the week of ${longDate(d)}`} className="self-end rounded-full hover:bg-fill">
                <DayNumber date={d} today={ctx.today} />
              </button>
              {exams.map((c) => (
                <button key={c.id} type="button" draggable
                  onDragStart={(e) => { e.dataTransfer.setData(DRAG_EXAM, c.id); e.dataTransfer.effectAllowed = "move"; }}
                  onClick={(e) => { e.stopPropagation(); ctx.open({ mode: "exam", courseId: c.id }, anchorOf(e.currentTarget)); }}
                  className="truncate rounded-[4px] px-1.5 py-px text-left text-[11px] font-semibold"
                  style={selected === c.id ? { background: EXAM_COLOR, color: "#fff" } : { background: tint(EXAM_COLOR).fill, color: tint(EXAM_COLOR).text }}>
                  {c.name} exam
                </button>
              ))}
              {/* Phones: one dot per session. */}
              <div className="flex flex-wrap gap-0.5 px-0.5 sm:hidden">
                {mine.map((s) => <span key={s.id} className="size-1.5 rounded-full" style={{ background: colorOf(ctx.input.courses, s.courseId) }} />)}
              </div>
              {mine.slice(0, shown).map((s) => {
                const c = colorOf(ctx.input.courses, s.courseId);
                const on = selected === s.id;
                return (
                  <button key={s.id} type="button" draggable
                    onDragStart={(e) => { e.dataTransfer.setData(DRAG_SESSION, s.id); e.dataTransfer.effectAllowed = "move"; }}
                    onClick={(e) => { e.stopPropagation(); ctx.open({ mode: "session", session: s }, anchorOf(e.currentTarget)); }}
                    className="hidden min-w-0 items-center gap-1 rounded-[4px] px-1 py-px text-left text-[11px] sm:flex"
                    style={on ? { background: c, color: "#fff" } : undefined}>
                    <span className="size-1.5 shrink-0 rounded-full" style={{ background: on ? "#fff" : c }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{nameOf(ctx, s.courseId)}</span>
                    <span className={`shrink-0 tabular-nums ${on ? "" : "text-muted"}`}>{s.start}</span>
                  </button>
                );
              })}
              {mine.length > shown && (
                <button type="button" onClick={(e) => { e.stopPropagation(); onDay(d); }} className="hidden self-start px-1 text-[11px] font-medium text-muted hover:text-ink sm:block">{mine.length - shown} more</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Sel = { date: string; anchor: number; at: number };
/** An event being dragged with the pointer: where it is now (start null: the all-day row) and where it was picked up. */
type Drag = {
  kind: "session" | "exam";
  id: string;
  len: number;
  offset: number; // minutes between the event's top and the grab point
  date: string;
  start: number | null;
  x0: number;
  y0: number;
  armed: boolean; // a mouse drags at once; a finger only after pressing and holding
  moved: boolean;
  el: HTMLElement;
};

/**
 * Week view: a time grid. Drag over empty time to pick a span (a click picks one session length); on a touch
 * screen, tap. Either opens a popover to add a session, exam or free time. Events follow the pointer as they are
 * dragged to another day and time (on touch screens, press and hold first), and a session's bottom edge drags to
 * change its length. Weekly free time shows as a green band, and a red line marks the time now.
 * On desktop the day is scaled to fit the screen; phones fit the whole week across and scroll the hours.
 */
export function WeekView({ ctx, start }: { ctx: Ctx; start: string }) {
  const mobile = useMedia("(max-width: 767px)");
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const sessions = shownSessions(ctx).filter((s) => s.date >= days[0] && s.date <= days[6]);
  const exams = ctx.input.courses.filter((c) => c.examDate >= days[0] && c.examDate <= days[6] && !ctx.hidden.has(c.id));
  const starts = [...sessions.map((s) => toMins(s.start)), ...ctx.input.free.map((b) => toMins(b.start)), ...exams.filter((c) => c.examTime).map((c) => toMins(c.examTime))];
  const from = Math.floor(Math.min(7 * 60, ...starts) / 60) * 60;
  const to = 24 * 60;
  const scroller = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const [ppm, setPpm] = useState(MOBILE_PX_PER_MIN);
  const height = (to - from) * ppm;
  const now = useNow();
  const pointer = useRef("mouse");
  const dragRef = useRef<Drag | null>(null);
  const hold = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [sel, setSel] = useState<Sel | null>(null);
  const [resize, setResize] = useState<{ id: string; end: number } | null>(null);
  const draft = ctx.active?.mode === "new" ? ctx.active : null;
  const selected = ctx.active?.mode === "session" ? ctx.active.session.id : ctx.active?.mode === "exam" ? ctx.active.courseId : null;

  // Desktop: fit the hours to the space left on screen. Phones: a fixed scale, scrolled.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const fit = () => setPpm(mobile ? MOBILE_PX_PER_MIN : Math.max(MIN_FIT_PX_PER_MIN, (el.clientHeight - (head.current?.offsetHeight ?? 0) - 2) / (to - from)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    if (head.current) ro.observe(head.current);
    return () => ro.disconnect();
  }, [mobile, from, to]);

  // Phones open scrolled to the first thing on the calendar this week.
  useEffect(() => {
    const el = scroller.current;
    if (el && mobile) el.scrollTop = Math.max(0, (Math.min(17 * 60, ...starts) - from - 30) * MOBILE_PX_PER_MIN);
  }, [start, mobile]); // eslint-disable-line react-hooks/exhaustive-deps -- scroll only when the week changes, not on every edit

  // While a finger drags an event, stop the page from scrolling under it.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const stop = (e: TouchEvent) => { if (dragRef.current?.armed) e.preventDefault(); };
    el.addEventListener("touchmove", stop, { passive: false });
    return () => el.removeEventListener("touchmove", stop);
  }, []);

  /** Minute of the day under a point in a column. Measured on screen, so page zoom does not throw it off. */
  const minuteAt = (y: number, col: Element) => { const r = col.getBoundingClientRect(); return from + ((y - r.top) / r.height) * (to - from); };
  const columns = () => [...(scroller.current?.querySelectorAll<HTMLElement>("[data-col]") ?? [])];
  /** The day and time under the pointer for a dragged event; above the grid, an exam lands in the all-day row. */
  const locate = (x: number, y: number, d: Drag) => {
    const cols = columns();
    const col = cols.find((c) => { const r = c.getBoundingClientRect(); return x >= r.left && x < r.right; }) ?? (x < cols[0].getBoundingClientRect().left ? cols[0] : cols[cols.length - 1]);
    if (d.kind === "exam" && y < col.getBoundingClientRect().top) return { date: col.dataset.col!, start: null };
    return { date: col.dataset.col!, start: Math.max(0, Math.min(to - d.len, snap(minuteAt(y, col) - d.offset))) };
  };

  const openSession = (s: StoredSession, el: Element) => ctx.open({ mode: "session", session: s }, anchorOf(el));
  const openExam = (c: TimetableCourse, el: Element) => ctx.open({ mode: "exam", courseId: c.id }, anchorOf(el));

  /** Pointer handlers that let an event be tapped open or dragged to a new day and time. */
  const grab = (kind: Drag["kind"], id: string, len: number, startMins: number | null, date: string, onTap: (el: HTMLElement) => void) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      pointer.current = e.pointerType;
      if (e.button !== 0) return;
      e.stopPropagation();
      const col = e.currentTarget.closest("[data-col]");
      const offset = col && startMins !== null ? minuteAt(e.clientY, col) - startMins : 0;
      const d: Drag = { kind, id, len, offset, date, start: startMins, x0: e.clientX, y0: e.clientY, armed: e.pointerType !== "touch", moved: false, el: e.currentTarget };
      dragRef.current = d;
      e.currentTarget.setPointerCapture(e.pointerId);
      if (e.pointerType === "touch") {
        hold.current = setTimeout(() => {
          if (dragRef.current !== d) return;
          d.armed = d.moved = true;
          navigator.vibrate?.(8);
          setDrag({ ...d });
        }, HOLD_MS);
      }
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const d = dragRef.current;
      if (!d || d.id !== id) return;
      const dist = Math.hypot(e.clientX - d.x0, e.clientY - d.y0);
      if (!d.armed) { if (dist > 8) { clearTimeout(hold.current); dragRef.current = null; } return; } // a finger that moves first is scrolling
      if (!d.moved && dist < 4) return;
      d.moved = true;
      Object.assign(d, locate(e.clientX, e.clientY, d));
      setDrag({ ...d });
    },
    onPointerUp: () => {
      const d = dragRef.current;
      clearTimeout(hold.current);
      dragRef.current = null;
      setDrag(null);
      if (!d || d.id !== id) return;
      if (!d.moved) return onTap(d.el);
      if (kind === "session") {
        const s = ctx.sessions.find((o) => o.id === id);
        if (s && d.start !== null) ctx.moveSession(s, d.date, d.start);
      } else ctx.moveExam(id, d.date, d.start === null ? "" : toHhmm(d.start));
    },
    onPointerCancel: () => { clearTimeout(hold.current); dragRef.current = null; setDrag(null); },
    // Keyboard activation (Enter or Space) arrives as a click with no pointer; pointer taps are handled above.
    onClick: (e: React.MouseEvent<HTMLElement>) => { e.stopPropagation(); if (e.detail === 0) onTap(e.currentTarget); },
  });

  /** The picked span, in minutes: from the press to the pointer, at least one snap long. */
  const span = (s: Sel) => {
    const [a, b] = s.at >= s.anchor ? [s.anchor, Math.max(s.anchor + SNAP, Math.ceil(s.at / SNAP) * SNAP)] : [Math.floor(s.at / SNAP) * SNAP, s.anchor + SNAP];
    return [Math.max(0, a), Math.min(to, b)];
  };
  const spanAnchor = (col: Element, a: number, b: number): Anchor => {
    const r = col.getBoundingClientRect();
    const y = (m: number) => r.top + ((m - from) / (to - from)) * r.height;
    return { left: r.left, right: r.right, top: y(a), bottom: y(b) };
  };
  const openSpan = (date: string, a: number, b: number, col: Element) => ctx.open({ mode: "new", date, start: toHhmm(a), end: toHhmm(b) }, spanAnchor(col, a, b));
  /** A tap or plain click: the half hour it landed in, for one session length. */
  const openAt = (date: string, m: number, col: Element) => {
    const a = Math.max(0, Math.min(to - ctx.input.sessionMins, Math.floor(m / 30) * 30));
    openSpan(date, a, a + ctx.input.sessionMins, col);
  };

  const hasAllDay = exams.some((c) => !c.examTime) || drag?.kind === "exam";
  // The event being dragged stays where it was, faded, while its copy follows the pointer. It must stay mounted:
  // it holds the pointer capture that brings the drop back to it.
  const lifted = (id: string) => (drag?.id === id && drag.moved ? 0.35 : undefined);
  const cols = mobile ? GRID_COLS_MOBILE : GRID_COLS;
  const block = (a: number, b: number) => ({ top: (a - from) * ppm + 1, height: Math.max(14, (b - a) * ppm - 2) });

  return (
    <div ref={scroller} className={`${cardCls} nl-type-fixed relative select-none ${mobile ? "max-h-[72dvh] overflow-y-auto overflow-x-hidden" : "min-h-0 flex-1 overflow-auto"}`}>
      <div className={`grid ${cols}`}>
        {/* Day headers and the all-day row stay put while the hours scroll. */}
        <div ref={head} className={`sticky top-0 z-30 col-span-8 grid ${cols} border-b border-edge/[0.08] bg-surface/90 backdrop-blur-md`}>
          <div className={`sticky left-0 flex items-end justify-end bg-surface/90 pb-1.5 text-faint ${mobile ? "px-1 text-[9px]" : "px-2 text-[10px]"}`}>{hasAllDay && (mobile ? "all" : "all-day")}</div>
          {days.map((d) => (
            <div key={d} data-head={d} className={`flex min-w-0 flex-col gap-1 border-l border-edge/[0.06] pb-1.5 pt-2 ${mobile ? "px-0.5" : "px-1.5"}`}>
              {/* Phones stack the day's initial over its number, as calendar apps do in a narrow week. */}
              <div className={`flex items-center ${mobile ? "flex-col gap-0.5" : "gap-1.5"}`}>
                <span className={`text-[11px] font-semibold uppercase tracking-wide ${d === ctx.today ? "text-red" : "text-muted"}`}>{mobile ? WEEKDAYS[weekday(d)][0] : WEEKDAYS[weekday(d)]}</span>
                <DayNumber date={d} today={ctx.today} big={!mobile} />
              </div>
              {exams.filter((c) => c.examDate === d && !c.examTime).map((c) => (
                <button key={c.id} type="button" {...grab("exam", c.id, EXAM_MINS, null, d, (el) => openExam(c, el))}
                  className={`cursor-grab touch-manipulation truncate rounded-[5px] py-0.5 text-left font-semibold active:cursor-grabbing ${mobile ? "px-1 text-[10px]" : "px-1.5 text-[11px]"}`}
                  style={{ ...(selected === c.id ? { background: EXAM_COLOR, color: "#fff" } : { background: tint(EXAM_COLOR).fill, color: tint(EXAM_COLOR).text }), opacity: lifted(c.id) }}>
                  {c.name} exam
                </button>
              ))}
              {drag?.kind === "exam" && drag.moved && drag.start === null && drag.date === d && (
                <span className="truncate rounded-[5px] px-1.5 py-0.5 text-[11px] font-semibold text-white shadow-lg" style={{ background: EXAM_COLOR }}>{nameOf(ctx, drag.id)} exam</span>
              )}
            </div>
          ))}
        </div>

        <div className="sticky left-0 z-20 bg-surface" style={{ height }}>
          {Array.from({ length: (to - from) / 60 }, (_, i) => (
            // An hour label the red time-now label would cover is left out, as calendars do.
            i > 0 && !(now !== null && days.includes(ctx.today) && Math.abs(now - from - i * 60) < 15) && <span key={i} className={`absolute -translate-y-1/2 ${mobile ? "right-1" : "right-2"} text-[10px] tabular-nums text-faint`} style={{ top: i * 60 * ppm }}>{hourLabel(from + i * 60)}</span>
          ))}
          {now !== null && days.includes(ctx.today) && now >= from && (
            <span className="absolute right-0.5 z-10 -translate-y-1/2 rounded-full bg-red px-1 text-[10px] font-semibold tabular-nums text-white" style={{ top: (now - from) * ppm }}>{toHhmm(now)}</span>
          )}
        </div>

        {days.map((d) => {
          const free = ctx.input.free.filter((b) => b.day === weekday(d));
          const s = sel?.date === d ? span(sel) : null;
          const dayExams = exams.filter((c) => c.examDate === d && c.examTime);
          const daySessions = sessions.filter((x) => x.date === d);
          type Item = { key: string; a: number; b: number; render: (pos: { left: string; width: string }) => React.ReactNode };
          const items: Item[] = [
            ...dayExams.map((c): Item => {
              const a = toMins(c.examTime);
              const b = Math.min(to, a + EXAM_MINS);
              const on = selected === c.id;
              return {
                key: c.id, a, b, render: (pos) => (
                  <button type="button" aria-label={`${c.name} exam at ${c.examTime}`} {...grab("exam", c.id, EXAM_MINS, a, d, (el) => openExam(c, el))}
                    className="absolute z-[5] flex cursor-grab touch-manipulation overflow-hidden rounded-[6px] text-left text-[11px] leading-tight active:cursor-grabbing"
                    style={{ ...block(a, b), ...pos, background: on ? EXAM_COLOR : tint(EXAM_COLOR).fill, color: on ? "#fff" : tint(EXAM_COLOR).text, boxShadow: `inset 3px 0 0 ${EXAM_COLOR}`, opacity: lifted(c.id) }}>
                    <span className="flex h-full w-full flex-col overflow-hidden py-1 pl-2 pr-1">
                      <span className="truncate font-semibold">{c.name} exam</span>
                      <span className="truncate tabular-nums opacity-80">{c.examTime}</span>
                    </span>
                  </button>
                ),
              };
            }),
            ...daySessions.map((x): Item => {
              const a = toMins(x.start);
              const b = resize?.id === x.id ? resize.end : toMins(x.end);
              return { key: x.id, a, b, render: (pos) => <SessionBlock ctx={ctx} s={x} a={a} b={b} pos={pos} style={{ ...block(a, b), opacity: lifted(x.id) }} on={selected === x.id} handlers={grab("session", x.id, b - a, a, d, (el) => openSession(x, el))} resize={resize} setResize={setResize} minuteAt={minuteAt} /> };
            }),
          ];
          const layout = lanes(items, (i) => [i.a, i.b]);
          return (
            <div
              key={d}
              data-col={d}
              onPointerDown={(e) => {
                pointer.current = e.pointerType;
                if (e.pointerType === "touch" || e.button !== 0) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                const m = Math.floor(minuteAt(e.clientY, e.currentTarget) / SNAP) * SNAP;
                setSel({ date: d, anchor: m, at: m });
              }}
              onPointerMove={(e) => { if (sel?.date === d) setSel({ ...sel, at: minuteAt(e.clientY, e.currentTarget) }); }}
              onPointerUp={(e) => {
                if (!sel || sel.date !== d) return;
                const [a, b] = span(sel);
                setSel(null);
                if (b - a <= SNAP) openAt(d, sel.anchor, e.currentTarget);
                else openSpan(d, a, b, e.currentTarget);
              }}
              onPointerCancel={() => setSel(null)}
              onClick={(e) => { if (pointer.current === "touch") openAt(d, minuteAt(e.clientY, e.currentTarget), e.currentTarget); }}
              className={`relative border-l border-edge/[0.06] ${d === ctx.today ? "bg-red/[0.025]" : weekday(d) > 4 ? "bg-canvas/50" : ""}`}
              style={{ height, backgroundImage: `repeating-linear-gradient(to bottom, var(--hairline) 0 0.5px, transparent 0.5px ${60 * ppm}px)` }}
            >
              {free.map((b) => {
                const a = toMins(b.start);
                const e = toMins(b.end);
                const on = ctx.active?.mode === "free" && ctx.active.block.id === b.id;
                return (
                  <div key={b.id} className="pointer-events-none absolute inset-x-0" style={{ top: (a - from) * ppm, height: (e - a) * ppm, background: `color-mix(in srgb, ${FREE_COLOR} ${on ? 22 : 11}%, transparent)` }}>
                    {/* Events leave the right edge clear, so this strip always shows and can be tapped. */}
                    <button type="button" onPointerDown={(ev) => { pointer.current = ev.pointerType; ev.stopPropagation(); }}
                      onClick={(ev) => { ev.stopPropagation(); ctx.open({ mode: "free", block: b }, anchorOf(ev.currentTarget)); }}
                      className="pointer-events-auto absolute inset-y-0 right-0 w-[5px] rounded-l-[3px] opacity-60 hover:opacity-100" style={{ background: FREE_COLOR }}
                      title={`Free time ${b.start}–${b.end}, every ${WEEKDAYS[b.day]}`} aria-label={`Change free time ${b.start} to ${b.end}`} />
                  </div>
                );
              })}
              {items.map((i) => {
                const l = layout.get(i)!;
                return <span key={i.key}>{i.render({ left: `calc(${(l.lane / l.of) * 100}% + 2px)`, width: `calc(${100 / l.of}% - 12px)` })}</span>;
              })}
              {drag?.moved && drag.start !== null && drag.date === d && (() => {
                const courseId = drag.kind === "exam" ? drag.id : ctx.sessions.find((o) => o.id === drag.id)?.courseId ?? "";
                const c = drag.kind === "exam" ? EXAM_COLOR : colorOf(ctx.input.courses, courseId);
                return (
                  <div className="pointer-events-none absolute left-0.5 right-2.5 z-40 flex flex-col overflow-hidden rounded-[6px] py-1 pl-2 pr-1 text-[11px] font-semibold leading-tight text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
                    style={{ ...block(drag.start, drag.start + drag.len), background: c }}>
                    <span className="truncate">{nameOf(ctx, courseId)}{drag.kind === "exam" && " exam"}</span>
                    <span className="tabular-nums opacity-90">{toHhmm(drag.start)}–{toHhmm(drag.start + drag.len)}</span>
                  </div>
                );
              })()}
              {(s || (draft?.date === d && !sel)) && (() => {
                const [a, b] = s ?? [toMins(draft!.start), toMins(draft!.end)];
                return (
                  <div className="pointer-events-none absolute left-0.5 right-2.5 z-30 flex flex-col overflow-hidden rounded-[6px] py-1 pl-2 pr-1 text-[11px] font-semibold leading-tight text-white shadow-[0_4px_14px_rgba(0,102,204,0.35)]" style={{ ...block(a, b), background: "var(--color-blue)" }}>
                    <span>New</span>
                    <span className="tabular-nums opacity-90">{toHhmm(a)}–{toHhmm(b)}</span>
                  </div>
                );
              })()}
              {now !== null && d === ctx.today && now >= from && (
                <div className="pointer-events-none absolute inset-x-0 z-[35] h-0 border-t-2 border-red" style={{ top: (now - from) * ppm }}>
                  <span className="absolute -left-[5px] -top-[5px] size-2 rounded-full bg-red" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SessionBlock({ ctx, s, a, b, pos, style, on, handlers, resize, setResize, minuteAt }: {
  ctx: Ctx;
  s: StoredSession;
  a: number;
  b: number;
  pos: { left: string; width: string };
  style: { top: number; height: number; opacity?: number };
  on: boolean;
  handlers: React.HTMLAttributes<HTMLElement>;
  resize: { id: string; end: number } | null;
  setResize: (r: { id: string; end: number } | null) => void;
  minuteAt: (y: number, col: Element) => number;
}) {
  const c = colorOf(ctx.input.courses, s.courseId);
  const t = tint(c);
  const tall = style.height >= 30;
  return (
    <button
      type="button"
      {...handlers}
      aria-label={`${nameOf(ctx, s.courseId)}, ${s.start} to ${toHhmm(b)}`}
      className="group absolute z-10 flex cursor-grab touch-manipulation overflow-hidden rounded-[6px] text-left text-[11px] leading-tight transition-shadow hover:shadow-[0_1px_4px_rgba(0,0,0,0.12)] active:cursor-grabbing"
      style={{ ...style, ...pos, background: on ? c : t.fill, color: on ? "#fff" : t.text, boxShadow: on ? "0 4px 14px rgba(0,0,0,0.18)" : `inset 3px 0 0 ${c}` }}
    >
      {/* A wrapper, because a button centres overflowing content and would clip the course name off the top. */}
      <span className={`flex h-full w-full overflow-hidden pl-2 pr-1 ${tall ? "flex-col py-1" : "items-center gap-1"}`}>
        <span className="truncate font-semibold">{nameOf(ctx, s.courseId)}</span>
        <span className="truncate tabular-nums opacity-80">{s.start}{tall && `–${toHhmm(b)}`}</span>
        {s.review && style.height >= 44 && <span className="truncate font-medium opacity-80">Final review</span>}
      </span>
      {/* Bottom edge: drag to change the length. */}
      <span
        aria-hidden
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          setResize({ id: s.id, end: b });
        }}
        onPointerMove={(e) => {
          if (resize?.id !== s.id) return;
          const col = e.currentTarget.closest("[data-col]");
          if (col) setResize({ id: s.id, end: Math.max(a + MIN_SESSION_MINS, Math.min(a + MAX_SESSION_MINS, 24 * 60, snap(minuteAt(e.clientY, col)))) });
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          const r = resize;
          setResize(null);
          if (r?.id === s.id) ctx.moveSession(s, s.date, a, r.end);
        }}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize touch-none"
      />
    </button>
  );
}

/** List view: an agenda of the days ahead, each with its exams and sessions. */
export function ListView({ ctx }: { ctx: Ctx }) {
  const [shown, setShown] = useState(LIST_STEP);
  const sessions = shownSessions(ctx);
  const last = [...sessions.map((s) => s.date), ...ctx.input.courses.map((c) => c.examDate).filter(Boolean)].reduce((m, d) => (d > m ? d : m), ctx.today);
  const days = Array.from({ length: daysBetween(ctx.today, last) + 1 }, (_, i) => addDays(ctx.today, i));
  return (
    <div className={`${cardCls} min-h-0 flex-1 overflow-y-auto`}>
      {days.slice(0, shown).map((d) => {
        const mine = sessions.filter((s) => s.date === d);
        const exams = examsOn(ctx, d);
        return (
          <section key={d} className="border-b border-edge/[0.06] last:border-0">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-surface/90 px-4 py-2 backdrop-blur-md">
              <span className={`text-[13px] font-semibold ${d === ctx.today ? "text-red" : ""}`}>{d === ctx.today ? `Today · ${dayLabel(d)}` : fmt(d, { weekday: "long", day: "numeric", month: "long" })}</span>
              <button type="button" onClick={(e) => openNewOn(ctx, d, anchorOf(e.currentTarget))} className="flex size-7 items-center justify-center rounded-full text-[18px] leading-none text-blue hover:bg-fill" aria-label={`Add to ${longDate(d)}`}>+</button>
            </div>
            <div className="flex flex-col px-2 pb-2">
              {exams.map((c) => (
                <AgendaRow key={c.id} color={EXAM_COLOR} time={c.examTime || "all-day"} title={`${c.name} exam`} onOpen={(el) => ctx.open({ mode: "exam", courseId: c.id }, anchorOf(el))} />
              ))}
              {mine.map((s) => (
                <AgendaRow key={s.id} color={colorOf(ctx.input.courses, s.courseId)} time={`${s.start}–${s.end}`} title={nameOf(ctx, s.courseId)} note={s.review ? "Final review" : undefined} onOpen={(el) => ctx.open({ mode: "session", session: s }, anchorOf(el))} />
              ))}
              {!exams.length && !mine.length && <span className="px-2 py-1.5 text-[13px] text-faint">No events</span>}
            </div>
          </section>
        );
      })}
      {shown < days.length && (
        <div className="p-4"><Btn tone="plain" onClick={() => setShown((n) => n + LIST_STEP)}>Show the next {Math.min(LIST_STEP, days.length - shown)} days</Btn></div>
      )}
    </div>
  );
}

function AgendaRow({ color, time, title, note, onOpen }: { color: string; time: string; title: string; note?: string; onOpen: (el: Element) => void }) {
  return (
    <button type="button" onClick={(e) => onOpen(e.currentTarget)} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-left text-[14px] hover:bg-fill">
      <span className="h-8 w-[3px] shrink-0 rounded-full" style={{ background: color }} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        {note && <span className="block text-[12px] text-muted">{note}</span>}
      </span>
      <span className="shrink-0 text-[12px] tabular-nums text-muted">{time}</span>
    </button>
  );
}
