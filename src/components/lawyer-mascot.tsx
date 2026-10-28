"use client";

import { LiveMascot, useMediaQuery } from "./live-mascot";

const SIZE = 120;
const DIRECTIONS = "/landing/mascots/afro-directions.webp";
const REACTIONS = "/landing/mascots/afro-reactions.webp";

// Drawn in the mascot's 120×120 box: her hair tops out near y=8 and her shirt
// spans roughly x 40–82, y 78–98. The body stays put while the head turns.
function outfit() {
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
    </svg>
  );
}

// Poses and outfit ride inside LiveMascot so they breathe and lean with her.
export function LawyerMascot() {
  const shown = useMediaQuery("(min-width: 721px)");
  if (!shown) return null;

  return (
    <div data-mascot-slot className="fixed bottom-4 right-4 z-40" style={{ width: SIZE, height: SIZE }}>
      <LiveMascot directions={DIRECTIONS} reactions={REACTIONS} size={SIZE} label="NotifiedLaw mascot" overlay={outfit()} />
    </div>
  );
}
