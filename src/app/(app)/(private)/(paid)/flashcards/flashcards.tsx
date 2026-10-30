"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eyebrow, cardCls } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { MockCard, MockDeck } from "./mock";

type Q = MockCard & { deck: MockDeck };
type Session = { title: string; queue: Q[]; total: number; got: number; missed: Q[] };

const PURPLE = "#AF52DE";
const SWIPE = 90; // px a card must travel to count as a swipe

const cardsOf = (d: MockDeck, n = d.cards.length): Q[] => d.cards.slice(0, n).map((c) => ({ ...c, deck: d }));
const start = (title: string, queue: Q[]): Session => ({ title, queue, total: queue.length, got: 0, missed: [] });

/** Deck overview: what is due today, then every deck with how well it is known. Tapping either opens a review session. */
export function Flashcards({ decks, streak }: { decks: MockDeck[]; streak: number }) {
  const [session, setSession] = useState<Session | null>(null);
  const due = decks.flatMap((d) => cardsOf(d, d.due));
  const dueCourses = decks.filter((d) => d.due > 0).map((d) => d.course);

  return (
    <>
      <section className="flex flex-col gap-4 rounded-2xl p-5 shadow-card md:flex-row md:items-end md:justify-between md:p-7" style={{ background: `linear-gradient(135deg, ${PURPLE}26, ${PURPLE}0a), var(--surface)` }}>
        <div className="flex flex-col gap-1.5">
          <Eyebrow color={PURPLE}>Due today</Eyebrow>
          <div className="text-[34px] font-bold leading-none tracking-[-0.03em] md:text-[44px]">{due.length} cards</div>
          <div className="text-[14px] text-muted">{due.length ? dueCourses.join(" · ") : "You are all caught up."}</div>
          <div className="mt-1.5 flex flex-wrap gap-2 text-[12px] font-medium">
            <span className="rounded-full bg-surface px-2.5 py-1 shadow-[0_0_0_0.5px_var(--hairline)]">{streak}-day streak</span>
            <span className="rounded-full bg-surface px-2.5 py-1 shadow-[0_0_0_0.5px_var(--hairline)]">{decks.reduce((n, d) => n + d.cards.length, 0)} cards in {decks.length} decks</span>
          </div>
        </div>
        <button type="button" disabled={!due.length} onClick={() => setSession(start("Today's review", due))}
          className="h-12 w-full shrink-0 rounded-full px-7 text-[16px] font-semibold text-white active:opacity-80 disabled:opacity-40 md:w-auto" style={{ background: PURPLE }}>
          Start review
        </button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="m-0 text-[22px] font-bold tracking-[-0.02em]">Decks</h2>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4">
          {decks.map((d) => (
            <button key={d.code} type="button" onClick={() => setSession(start(d.course, cardsOf(d)))}
              className={`${cardCls} flex min-h-[76px] items-center gap-3.5 px-4 py-3.5 text-left transition-shadow hover:shadow-card-hover active:opacity-70`}>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold text-white" style={{ background: d.color }}>{d.code}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[15px] font-semibold">{d.course}</span>
                  {d.due > 0 && <span className="shrink-0 text-[12px] font-semibold" style={{ color: PURPLE }}>{d.due} due</span>}
                </span>
                <span className="h-1 overflow-hidden rounded-full bg-track"><span className="block h-full rounded-full" style={{ width: `${d.mastered * 100}%`, background: d.color }} /></span>
                <span className="text-[12px] text-muted">{d.cards.length} cards · {Math.round(d.mastered * 100)}% mastered</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {session && <Study session={session} setSession={setSession} />}
    </>
  );
}

/** A review session over the whole screen: flip the card, then swipe or tap whether you knew it. Missed cards come round again at the end. */
function Study({ session, setSession }: { session: Session; setSession: (s: Session | null) => void }) {
  const [flipped, setFlipped] = useState(false);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const card = session.queue[0];
  const close = () => setSession(null);

  const grade = (ok: boolean) => {
    const [cur, ...rest] = session.queue;
    setFlipped(false);
    setDx(0);
    setSession({ ...session, queue: ok ? rest : [...rest, cur], got: session.got + (ok ? 1 : 0), missed: ok || session.missed.includes(cur) ? session.missed : [...session.missed, cur] });
  };

  // The page underneath stays still while the session is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (!card) return;
      else if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped((f) => !f); }
      else if (flipped && e.key === "ArrowRight") grade(true);
      else if (flipped && e.key === "ArrowLeft") grade(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onDown = (e: React.PointerEvent) => { drag.current = { x: e.clientX, moved: false }; setDragging(true); e.currentTarget.setPointerCapture(e.pointerId); };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const d = e.clientX - drag.current.x;
    if (Math.abs(d) > 6) drag.current.moved = true;
    // Only an answered card can be swiped away; before that it gives a little.
    setDx(flipped ? d : d / 4);
  };
  const onUp = () => {
    const tap = drag.current && !drag.current.moved;
    drag.current = null;
    setDragging(false);
    if (tap) setFlipped((f) => !f);
    else if (flipped && Math.abs(dx) > SWIPE) grade(dx > 0);
    setDx(0);
  };

  const left = session.total - session.got;
  const pull = Math.min(1, Math.abs(dx) / SWIPE);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={session.title} className="fixed inset-0 z-[70] bg-canvas text-ink animate-[tt-fade_160ms_ease-out]">
      <div className="mx-auto flex h-full max-w-[560px] flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <button type="button" onClick={close} aria-label="End session" className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-hover"><Icon name="close" size={18} /></button>
          <div className="min-w-0 flex-1 text-center">
            <div className="truncate text-[15px] font-semibold">{session.title}</div>
            <div className="text-[12px] tabular-nums text-muted">{card ? `${left} left` : "Finished"}</div>
          </div>
          <span className="size-11 shrink-0" aria-hidden />
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-track">
          <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${(session.got / session.total) * 100}%`, background: PURPLE }} />
        </div>

        {card ? (
          <>
            <div className="flex min-h-0 flex-1 items-center justify-center py-5 [perspective:1400px]">
              <div
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                className="relative h-full max-h-[520px] min-h-[300px] w-full cursor-pointer touch-pan-y select-none"
                style={{ transform: `translateX(${dx}px) rotate(${dx / 24}deg)`, transition: dragging ? "none" : "transform 200ms ease-out" }}
              >
                <div className="relative size-full transition-transform duration-500 [transform-style:preserve-3d]" style={{ transform: flipped ? "rotateY(180deg)" : "none" }}>
                  <Face>
                    <Eyebrow color={card.deck.color}>{card.deck.code} · {card.deck.course}</Eyebrow>
                    <p className="text-pretty m-0 flex flex-1 items-center text-[22px] font-semibold leading-snug tracking-[-0.01em] md:text-[24px]">{card.q}</p>
                    <span className="text-center text-[13px] text-faint">Tap to reveal</span>
                  </Face>
                  <Face back>
                    <Eyebrow color={PURPLE}>Answer</Eyebrow>
                    <p className="text-pretty m-0 flex flex-1 items-center text-[19px] leading-snug md:text-[20px]">{card.a}</p>
                    <span className="flex items-center gap-1.5 text-[12px] text-muted"><Icon name="book" size={13} />{card.src}</span>
                  </Face>
                </div>
                {flipped && dx !== 0 && (
                  <span className={`pointer-events-none absolute top-5 rounded-lg border-2 px-2.5 py-1 text-[13px] font-bold tracking-[0.05em] ${dx > 0 ? "left-5 border-green text-green" : "right-5 border-red text-red"}`} style={{ opacity: pull }}>
                    {dx > 0 ? "GOT IT" : "AGAIN"}
                  </span>
                )}
              </div>
            </div>

            {flipped ? (
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => grade(false)} className="h-14 rounded-2xl bg-red/10 text-[16px] font-semibold text-red active:opacity-70">Again</button>
                <button type="button" onClick={() => grade(true)} className="h-14 rounded-2xl bg-green text-[16px] font-semibold text-white active:opacity-80">Got it</button>
              </div>
            ) : (
              <button type="button" onClick={() => setFlipped(true)} className="h-14 rounded-2xl bg-strong text-[16px] font-semibold text-strong-fg active:opacity-80">Show answer</button>
            )}
            <p className="m-0 mt-3 text-center text-[12px] text-faint">
              <span className="md:hidden">{flipped ? "Swipe right if you knew it, left to see it again" : "Tap the card to flip it"}</span>
              <span className="hidden md:inline">Space to flip · ← Again · → Got it</span>
            </p>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <span className="flex size-16 items-center justify-center rounded-full text-white" style={{ background: PURPLE }}><Icon name="tick" size={28} /></span>
            <h2 className="m-0 text-[26px] font-bold tracking-[-0.02em]">Session complete</h2>
            <p className="m-0 max-w-[300px] text-[15px] text-muted">
              {session.total} cards reviewed.{session.missed.length ? ` ${session.missed.length} needed a second look.` : " You knew every one first time."}
            </p>
            <div className="mt-4 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
              {session.missed.length > 0 && (
                <button type="button" onClick={() => setSession(start(`${session.title}: missed`, session.missed))} className="h-12 rounded-full px-6 text-[15px] font-semibold text-white" style={{ background: PURPLE }}>Review missed ({session.missed.length})</button>
              )}
              <button type="button" onClick={close} className="h-12 rounded-full bg-fill px-6 text-[15px] font-semibold">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** One side of a flashcard; the back starts turned away. */
function Face({ back, children }: { back?: boolean; children: React.ReactNode }) {
  return (
    <div className={`${cardCls} absolute inset-0 flex flex-col gap-4 overflow-y-auto p-6 [backface-visibility:hidden] md:p-8`} style={back ? { transform: "rotateY(180deg)" } : undefined}>
      {children}
    </div>
  );
}
