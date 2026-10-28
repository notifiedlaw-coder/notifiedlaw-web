"use client";

// Adapted from page-mascot 0.1.0 (https://github.com/nilbuild/page-mascot).
// Extended with idle life: blinking over any head direction, breathing, a
// lean and a glance that follow page scroll, dozing off when the reader goes
// idle, and a wink at the end of the page.
//
// MIT License
//
// Copyright (c) 2026 Kamran Ahmed <https://kamran.fyi>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { useEffect, useRef, useState, type ReactNode } from "react";

const DIRECTIONS = ["up-left", "up", "up-right", "left", "center", "right", "down-left", "down", "down-right"] as const;
const REACTIONS = ["blink", "heart", "sparkle", "surprised", "wink", "bashful", "sleepy", "dizzy", "delighted"] as const;
type Direction = (typeof DIRECTIONS)[number];
type Reaction = (typeof REACTIONS)[number];

// Clockwise from the right, matching atan2 with y pointing down.
const CLOCKWISE: Direction[] = ["right", "down-right", "down", "down-left", "left", "up-left", "up", "up-right"];
const SECTOR = (Math.PI * 2) / CLOCKWISE.length;
const HYSTERESIS = 0.12;
const DEAD_ZONE = 70;

const PAYOFFS: Reaction[] = ["heart", "sparkle", "delighted"];
const BOOP_PAYOFF = 120;
const BOOP_END = 560;
const SQUASH_MS = 420;
const DIZZY_AFTER = 4;
const DIZZY_WINDOW = 1600;
const DIZZY_END = 1100;
const SQUASH: Keyframe[] = [
  { transform: "scale(1, 1)", easing: "ease-in" },
  { transform: "scale(1.10, 0.86)", offset: 0.18, easing: "ease-out" },
  { transform: "scale(0.95, 1.08)", offset: 0.45, easing: "ease-in-out" },
  { transform: "scale(1.03, 0.97)", offset: 0.72, easing: "ease-in-out" },
  { transform: "scale(1, 1)" },
];

// A slow inhale: shoulders rise a touch, anchored at the bottom of the frame.
const BREATHE: Keyframe[] = [
  { transform: "scale(1, 1)" },
  { transform: "scale(1.012, 1.024)" },
  { transform: "scale(1, 1)" },
];
const BREATHE_MS = 4200;

// Blinks land every 2.8–6.5s, sometimes as a quick double.
const BLINK_MS = 120;
const BLINK_GAP = [2800, 6500] as const;
const DOUBLE_BLINK = 0.2;

// Scroll: px/ms that counts as a glance, and as a fling worth a startle.
const GLANCE_SPEED = 0.25;
const GLANCE_HOLD = 650;
const FLING_SPEED = 3.5;
const FLING_COOLDOWN = 8000;
const MAX_LEAN = 5; // degrees
const SPEED_DECAY_MS = 120; // smoothed speed halves roughly every 80ms
const STALE_SAMPLE_MS = 100; // longer gaps start a fresh speed reading
const USER_INPUT_MS = 150; // a fling needs wheel, touch or key input this recent
const DOZE_AFTER = 25000;
const WINK_MS = 900;

// Eye boxes per head direction in the 120×120 frame, traced from the sclera
// of each directions-sheet cell (the downward cells by hand, since their
// whites barely show). The lid covers the box; the lash sits low.
const EYES: Record<Direction, [number, number, number, number][]> = {
  "up-left": [[44.3, 45, 48.7, 51], [57.7, 48.7, 67.7, 57.3]],
  up: [[46, 47.7, 56, 55.3], [69.3, 48, 79, 55]],
  "up-right": [[59.3, 48.7, 69, 57.3], [78, 44, 82.7, 51]],
  left: [[48, 51, 54.7, 60]],
  center: [[46.3, 53, 56.3, 61.3], [69.3, 53.7, 79.3, 61.3]],
  right: [[72, 50.7, 78.3, 59.7]],
  "down-left": [[42, 58.5, 49, 66], [55.5, 53.5, 67.5, 64.5]],
  down: [[45.5, 59.5, 57.5, 69], [69, 59.5, 81, 68.5]],
  "down-right": [[59.5, 54, 73.5, 65], [77.5, 58.5, 85, 67]],
};
// Sampled from the skin just around her eyes on the sheet.
const SKIN = "#A6552F";
const LASH = "#2B1206";

// background-size 300% makes each cell a clean 0/50/100% step on both axes.
function cell(index: number) {
  return { backgroundPosition: `${(index % 3) * 50}% ${Math.floor(index / 3) * 50}%` };
}

function wrap(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

const layer = {
  position: "absolute",
  inset: 0,
  backgroundSize: "300% 300%",
  backgroundRepeat: "no-repeat",
} as const;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Live media-query match; false until mounted. */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);
  return matches;
}

function Eyelids({ direction, size }: { direction: Direction; size: number }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className="absolute inset-0">
      {EYES[direction].map(([x0, y0, x1, y1]) => {
        const cx = (x0 + x1) / 2;
        const cy = (y0 + y1) / 2;
        const h = y1 - y0;
        return (
          <g key={`${x0}-${y0}`}>
            <ellipse cx={cx} cy={cy} rx={(x1 - x0) / 2 + 1.4} ry={h / 2 + 1.4} fill={SKIN} />
            <path
              d={`M${x0 - 0.6} ${cy + h * 0.08} Q${cx} ${cy + h * 0.42} ${x1 + 0.6} ${cy + h * 0.08}`}
              fill="none"
              stroke={LASH}
              strokeWidth={1.2}
              strokeLinecap="round"
            />
          </g>
        );
      })}
    </svg>
  );
}

export type LiveMascotProps = {
  directions: string;
  reactions: string;
  size?: number;
  /** What a screen reader calls it. */
  label?: string;
  /** Poses drawn over her; they breathe and lean with her. */
  overlay?: ReactNode;
  /** Fade the live sprite out while an overlay pose stands in for it. */
  hideSprite?: boolean;
  /** Whose eyes blink: the live head, the front-facing head an overlay shows, or nobody. */
  blink?: "live" | "front" | false;
  /** False while she is hidden (e.g. by a media query): idle life pauses. */
  active?: boolean;
};

export function LiveMascot({
  directions,
  reactions,
  size = 140,
  label = "mascot",
  overlay,
  hideSprite = false,
  blink = "live",
  active = true,
}: LiveMascotProps) {
  const still = useMediaQuery("(prefers-reduced-motion: reduce)");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const leanRef = useRef<HTMLSpanElement>(null);
  const breatheRef = useRef<HTMLSpanElement>(null);
  const squashRef = useRef<HTMLSpanElement>(null);
  const lidsRef = useRef<HTMLSpanElement>(null);
  const timersRef = useRef<number[]>([]);
  const boopsRef = useRef({ count: 0, at: 0 });
  const reactionRef = useRef<Reaction | null>(null);
  const [aim, setAim] = useState<Direction>("center");
  const [glance, setGlance] = useState<Direction | null>(null);
  const [reaction, setReactionState] = useState<Reaction | null>(null);
  const direction = glance ?? aim;

  const setReaction = (next: Reaction | null) => {
    reactionRef.current = next;
    setReactionState(next);
  };
  const clearTimers = () => {
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current = [];
  };
  const later = (ms: number, next: Reaction | null) => {
    timersRef.current.push(window.setTimeout(() => setReaction(next), ms));
  };
  /** A short reaction that doesn't interrupt one already playing; true if it played. */
  const flash = (next: Reaction, ms: number) => {
    if (reactionRef.current) return false;
    clearTimers();
    setReaction(next);
    later(ms, null);
    return true;
  };

  // Follow the cursor (fine pointers only).
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let sector = -1;
    let pointer: { x: number; y: number } | null = null;
    const update = () => {
      const button = buttonRef.current;
      if (!button || !pointer) return;
      const box = button.getBoundingClientRect();
      const dx = pointer.x - (box.left + box.width / 2);
      const dy = pointer.y - (box.top + box.height / 2);
      if (Math.hypot(dx, dy) < DEAD_ZONE) {
        sector = -1;
        setAim("center");
        return;
      }
      // Hold the current sector until the pointer is well past its edge.
      const angle = Math.atan2(dy, dx);
      if (sector !== -1 && Math.abs(wrap(angle - sector * SECTOR)) < SECTOR / 2 + HYSTERESIS) return;
      sector = (Math.round(angle / SECTOR) + CLOCKWISE.length) % CLOCKWISE.length;
      setAim(CLOCKWISE[sector]);
    };
    const onPointerMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      update();
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", update);
    };
  }, []);

  // Breathing, slower while she dozes.
  useEffect(() => {
    const el = breatheRef.current;
    if (!el || !active || still) return;
    const anim = el.animate(BREATHE, { duration: BREATHE_MS, iterations: Infinity, easing: "ease-in-out" });
    return () => anim.cancel();
  }, [active, still]);
  useEffect(() => {
    breatheRef.current?.getAnimations().forEach((a) => (a.playbackRate = reaction === "sleepy" ? 0.6 : 1));
  }, [reaction]);

  // Blinking: lids drop over whichever way she's facing.
  useEffect(() => {
    if (!blink || !active) return;
    let timer = 0;
    const close = (delay: number) =>
      lidsRef.current?.animate(
        [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }],
        { duration: BLINK_MS, delay },
      );
    const schedule = () => {
      const [min, max] = BLINK_GAP;
      timer = window.setTimeout(() => {
        // No blinking through a reaction face or in a background tab.
        if (!reactionRef.current && !document.hidden) {
          close(0);
          if (Math.random() < DOUBLE_BLINK) close(BLINK_MS + 90);
        }
        schedule();
      }, min + Math.random() * (max - min));
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [blink, active]);

  // Scroll: lean with the page's momentum, glance the way it's moving, startle
  // at a hard fling, wink on reaching the end. Idle for a while and she dozes.
  useEffect(() => {
    if (!active) return;
    const leanEl = leanRef.current;
    let lastY = window.scrollY;
    let lastT = performance.now();
    let speed = 0; // px/ms at lastT, smoothed; positive scrolling down
    let lean = 0;
    let raf = 0;
    let glanceTimer = 0;
    let dozeTimer = 0;
    let lastFling = -Infinity;
    let lastInput = -Infinity; // wheel, touch or key: scrolls the reader drives
    let lastActivity = performance.now();
    let atEnd = false;

    // Speed fades with time since the last scroll event, so it behaves the
    // same at any refresh rate.
    const speedAt = (t: number) => speed * Math.exp(-Math.max(0, t - lastT) / SPEED_DECAY_MS);

    const tick = (t: number) => {
      const current = speedAt(t);
      const target = Math.max(-MAX_LEAN, Math.min(MAX_LEAN, -current * 2.4));
      lean += (target - lean) * 0.14;
      const el = leanEl;
      if (el) el.style.transform = `translateY(${-Math.abs(lean) * 0.35}px) rotate(${lean}deg)`;
      raf = Math.abs(lean) > 0.02 || Math.abs(current) > 0.01 ? requestAnimationFrame(tick) : 0;
      if (!raf && el) el.style.transform = "";
    };

    // One timer that re-arms for whatever idle time is left, rather than
    // being reset on every pointer move.
    const armDoze = (ms: number) => {
      dozeTimer = window.setTimeout(() => {
        const idle = performance.now() - lastActivity;
        if (idle < DOZE_AFTER) return armDoze(DOZE_AFTER - idle);
        if (!reactionRef.current) setReaction("sleepy");
      }, ms);
    };
    const wake = () => {
      lastActivity = performance.now();
      if (reactionRef.current === "sleepy") {
        clearTimers();
        setReaction("blink");
        later(160, null);
        window.clearTimeout(dozeTimer);
        armDoze(DOZE_AFTER);
      }
    };
    const onInput = () => {
      lastInput = performance.now();
      wake();
    };

    const onScroll = () => {
      const now = performance.now();
      const y = window.scrollY;
      const dt = now - lastT;
      const v = (y - lastY) / Math.max(8, dt);
      const before = speedAt(now);
      lastY = y;
      lastT = now;
      wake();
      // A long gap (first event, restored or programmatic jump) starts fresh.
      if (dt > STALE_SAMPLE_MS) {
        speed = 0;
        return;
      }
      speed = before * 0.6 + v * 0.4;

      if (Math.abs(speed) > GLANCE_SPEED) {
        setGlance(speed > 0 ? "down" : "up");
        window.clearTimeout(glanceTimer);
        glanceTimer = window.setTimeout(() => setGlance(null), GLANCE_HOLD);
      }
      // Only the reader's own hard fling startles her, not an anchor glide or
      // scroll restore; smoothed, so one wheel notch's jump doesn't count.
      const userDriven = now - lastInput < USER_INPUT_MS;
      if (userDriven && Math.abs(speed) > FLING_SPEED && now - lastFling > FLING_COOLDOWN && flash("surprised", 520)) {
        lastFling = now;
      }
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (y >= max - 4 && !atEnd && flash("wink", WINK_MS)) atEnd = true;
      if (y < max - 200) atEnd = false;

      if (!still && !raf) raf = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onInput, { passive: true });
    window.addEventListener("touchmove", onInput, { passive: true });
    window.addEventListener("keydown", onInput);
    window.addEventListener("pointermove", wake, { passive: true });
    window.addEventListener("pointerdown", wake, { passive: true });
    armDoze(DOZE_AFTER);
    return () => {
      cancelAnimationFrame(raf);
      if (leanEl) leanEl.style.transform = "";
      window.clearTimeout(glanceTimer);
      window.clearTimeout(dozeTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onInput);
      window.removeEventListener("touchmove", onInput);
      window.removeEventListener("keydown", onInput);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("pointerdown", wake);
    };
    // The handlers read live reaction state through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, still]);

  useEffect(() => clearTimers, []);

  const boop = () => {
    clearTimers();
    const now = Date.now();
    const boops = boopsRef.current;
    boops.count = now - boops.at < DIZZY_WINDOW ? boops.count + 1 : 1;
    boops.at = now;
    if (boops.count >= DIZZY_AFTER) {
      boops.count = 0;
      setReaction("dizzy");
      later(DIZZY_END, null);
    } else {
      setReaction("blink");
      later(BOOP_PAYOFF, PAYOFFS[(boops.count - 1) % PAYOFFS.length]);
      later(BOOP_END, null);
    }
    if (reducedMotion()) return;
    // Per-keyframe easing with the effect itself linear: an easing on the effect
    // would reinterpret every offset and front-load the whole bounce.
    squashRef.current?.animate(SQUASH, { duration: SQUASH_MS, easing: "linear" });
  };

  const fill = { position: "relative", display: "block", width: "100%", height: "100%" } as const;

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={boop}
      aria-label={`Boop the ${label}`}
      style={{
        position: "relative",
        display: "block",
        flexShrink: 0,
        width: size,
        height: size,
        padding: 0,
        border: 0,
        background: "transparent",
        appearance: "none",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <span ref={leanRef} style={{ ...fill, transformOrigin: "50% 95%" }}>
        <span ref={breatheRef} style={{ ...fill, transformOrigin: "50% 100%" }}>
          <span ref={squashRef} style={{ ...fill, transformOrigin: "50% 78%" }}>
            <span style={{ position: "absolute", inset: 0, opacity: hideSprite ? 0 : 1, transition: "opacity 300ms" }}>
              <span
                style={{
                  ...layer,
                  backgroundImage: `url(${directions})`,
                  ...cell(DIRECTIONS.indexOf(direction)),
                  opacity: reaction ? 0 : 1,
                }}
              />
              <span
                style={{
                  ...layer,
                  backgroundImage: `url(${reactions})`,
                  ...cell(REACTIONS.indexOf(reaction ?? "blink")),
                  opacity: reaction ? 1 : 0,
                }}
              />
            </span>
            {overlay}
            {blink ? (
              <span ref={lidsRef} aria-hidden="true" style={{ position: "absolute", inset: 0, opacity: 0, pointerEvents: "none" }}>
                <Eyelids direction={blink === "front" ? "center" : direction} size={size} />
              </span>
            ) : null}
          </span>
        </span>
      </span>
    </button>
  );
}
