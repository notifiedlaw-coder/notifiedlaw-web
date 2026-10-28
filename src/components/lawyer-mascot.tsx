"use client";

import { LiveMascot, useMediaQuery } from "./live-mascot";

const SIZE = 120;
const DIRECTIONS = "/landing/mascots/glasses-directions.webp";
const REACTIONS = "/landing/mascots/glasses-reactions.webp";

// Drawn in the mascot's 120×120 box: her shirt spans roughly x 30–92, y 83–103
// with the neck at x≈61. The body stays put while the head turns.
const outfit = (
  <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden="true">
    {/* Black gown over the shoulders, open at the neck. */}
    <path d="M28 104 Q30 86 49 81 L61 98 L73 81 Q92 86 94 104 Z" fill="#1D1D1F" />
    <path d="M49 81 L61 98 L73 81" fill="none" stroke="#3A3A3C" strokeWidth={0.8} strokeLinejoin="round" />
    {/* White barrister's bands. */}
    <g transform="rotate(-2 61 92)">
      <path d="M57 86 L61 97 L54.5 100 Z" fill="#FFFFFF" stroke="#D2D2D7" strokeWidth={0.5} strokeLinejoin="round" />
      <path d="M65 86 L61 97 L67.5 100 Z" fill="#FFFFFF" stroke="#D2D2D7" strokeWidth={0.5} strokeLinejoin="round" />
    </g>
  </svg>
);

// Poses and outfit ride inside LiveMascot so they breathe and lean with her.
export function LawyerMascot() {
  const shown = useMediaQuery("(min-width: 721px)");
  if (!shown) return null;

  return (
    <div data-mascot-slot className="fixed bottom-4 right-4 z-40" style={{ width: SIZE, height: SIZE }}>
      {/* The eyelid boxes in LiveMascot were traced for the afro sheet, so blinking is off. */}
      <LiveMascot directions={DIRECTIONS} reactions={REACTIONS} size={SIZE} label="NotifiedLaw mascot" blink={false} overlay={outfit} />
    </div>
  );
}
