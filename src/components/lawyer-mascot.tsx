"use client";

import { LiveMascot, useMediaQuery, type Direction } from "./live-mascot";

const SIZE = 120;
const DIRECTIONS = "/landing/mascots/afro-directions.webp";
const REACTIONS = "/landing/mascots/afro-reactions.webp";

// Where her hair mass sits per head direction, traced from the directions
// sheet: [dx, dy, tilt°, squeeze]. The headwrap rides on it so it turns with her.
const WRAP: Record<Direction, [number, number, number, number]> = {
  "up-left": [8, 1, -4, 0.94],
  up: [0, 0, 0, 1],
  "up-right": [-8, 1, 4, 0.94],
  left: [6, 1, -3, 0.92],
  center: [0, 0, 0, 1],
  right: [-6, 1, 3, 0.92],
  "down-left": [3, 0, -2, 0.96],
  down: [0, -1, 0, 1],
  "down-right": [-3, 0, 2, 0.96],
};

// Drawn in the mascot's 120×120 box: her hair tops out near y=8 and her shirt
// spans roughly x 40–82, y 78–98. The body stays put while the head turns.
function outfit(direction: Direction) {
  const [dx, dy, tilt, squeeze] = WRAP[direction];
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden="true">
      {/* Black gown over the shoulders, open at the neck. */}
      <path d="M36 98 Q38 80 52 76 L62 90 L72 76 Q86 80 88 98 Z" fill="#1D1D1F" />
      <path d="M52 76 L62 90 L72 76" fill="none" stroke="#3A3A3C" strokeWidth={0.8} strokeLinejoin="round" />
      {/* White barrister's bands. */}
      <g transform="rotate(-2 62 86)">
        <path d="M58 80 L62 90 L55.5 93 Z" fill="#FFFFFF" stroke="#D2D2D7" strokeWidth={0.5} strokeLinejoin="round" />
        <path d="M66 80 L62 90 L68.5 93 Z" fill="#FFFFFF" stroke="#D2D2D7" strokeWidth={0.5} strokeLinejoin="round" />
      </g>
      {/* Headwrap: folded cloth over the top of the afro, knotted at the side. */}
      <g
        className="transition-transform duration-300 ease-out [transform-box:fill-box] [transform-origin:center_bottom] motion-reduce:transition-none"
        style={{ transform: `translate(${dx}px, ${dy}px) rotate(${tilt}deg) scaleX(${squeeze})` }}
      >
        <path d="M32 31 Q27 4 62 3 Q97 4 92 31 Q78 22 62 22 Q46 22 32 31 Z" fill="#8E1B3A" stroke="#5E1026" strokeWidth={0.7} />
        <path d="M33 25 Q62 12 91 25 M36 18 Q62 7 88 18" fill="none" stroke="#5E1026" strokeWidth={0.8} strokeLinecap="round" />
        <path d="M32 29 Q62 16 92 29" fill="none" stroke="#F5B800" strokeWidth={1.8} strokeLinecap="round" />
        <path d="M86 24 Q96 12 101 20 Q98 28 88 26 Z" fill="#A82348" stroke="#5E1026" strokeWidth={0.7} strokeLinejoin="round" />
        <path d="M86 24 Q90 12 82 8 Q80 18 86 24 Z" fill="#A82348" stroke="#5E1026" strokeWidth={0.7} strokeLinejoin="round" />
        <circle cx={87} cy={24.5} r={2.2} fill="#8E1B3A" stroke="#5E1026" strokeWidth={0.6} />
      </g>
    </svg>
  );
}

// Poses and outfit ride inside LiveMascot so they breathe and lean with her.
export function LawyerMascot() {
  const shown = useMediaQuery("(min-width: 721px)");
  if (!shown) return null;

  return (
    <div data-mascot-slot className="fixed bottom-4 right-4 z-40" style={{ width: SIZE, height: SIZE }}>
      <LiveMascot directions={DIRECTIONS} reactions={REACTIONS} size={SIZE} label="NotifiedLaw mascot" overlay={outfit} />
    </div>
  );
}
