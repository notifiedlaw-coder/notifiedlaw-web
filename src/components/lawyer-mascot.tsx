"use client";

import { LiveMascot, useMediaQuery, type Direction } from "./live-mascot";

const SIZE = 120;
const DIRECTIONS = "/landing/mascots/afro-directions.webp";
const REACTIONS = "/landing/mascots/afro-reactions.webp";

// Where her hair mass sits per head direction, traced from the directions
// sheet: [dx, dy, tilt°, squeeze]. The bun rides on it so it turns with her.
const BUN: Record<Direction, [number, number, number, number]> = {
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
  const [dx, dy, tilt, squeeze] = BUN[direction];
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
      {/* Top bun: a round coil of curls sitting on the crown, with a hair tie. */}
      <g
        className="transition-transform duration-300 ease-out [transform-box:fill-box] [transform-origin:center_bottom] motion-reduce:transition-none"
        style={{ transform: `translate(${dx}px, ${dy}px) rotate(${tilt}deg) scaleX(${squeeze})` }}
      >
        <circle cx={62} cy={0} r={14} fill="#0F0D0C" />
        {[[52, -6], [62, -10], [72, -6], [49, 3], [75, 3], [57, 5], [67, 5]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={5.5} fill="#0F0D0C" stroke="#2A2522" strokeWidth={0.6} />
        ))}
        <path d="M56 -4 Q62 -9 68 -4 M54 2 Q62 -3 70 2" fill="none" stroke="#2A2522" strokeWidth={0.7} strokeLinecap="round" />
        <path d="M50 10 Q62 6 74 10" fill="none" stroke="#F5B800" strokeWidth={2.2} strokeLinecap="round" />
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
