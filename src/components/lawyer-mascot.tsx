"use client";

import { LiveMascot, useMediaQuery } from "./live-mascot";

const SIZE = 120;
const DIRECTIONS = "/landing/mascots/afro-directions.webp";
const REACTIONS = "/landing/mascots/afro-reactions.webp";

// Drawn in the mascot's 120×120 box: her hair tops out near y=8 and her shirt
// spans roughly x 40–82, y 78–98. The body stays put while the head turns.
const outfit = (
  <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden="true">
    {/* Black gown over the shoulders, open at the neck. */}
    <path d="M36 98 Q38 80 52 76 L62 90 L72 76 Q86 80 88 98 Z" fill="#1D1D1F" />
    <path d="M52 76 L62 90 L72 76" fill="none" stroke="#3A3A3C" strokeWidth={0.8} strokeLinejoin="round" />
    {/* White barrister's bands. */}
    <g transform="rotate(-2 62 86)">
      <path d="M58 80 L62 90 L55.5 93 Z" fill="#FFFFFF" stroke="#D2D2D7" strokeWidth={0.5} strokeLinejoin="round" />
      <path d="M66 80 L62 90 L68.5 93 Z" fill="#FFFFFF" stroke="#D2D2D7" strokeWidth={0.5} strokeLinejoin="round" />
    </g>
    {/* Powdered wig perched on the afro, rows of rolled curls. */}
    <g>
      <path d="M33 30 Q31 8 62 6 Q93 8 91 30 Q80 21 62 21 Q44 21 33 30 Z" fill="#F2EEE6" stroke="#CFC8BA" strokeWidth={0.7} />
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={`a${i}`} cx={42 + i * 10} cy={17} r={3.4} fill="none" stroke="#CFC8BA" strokeWidth={0.7} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <circle key={`b${i}`} cx={47 + i * 10} cy={11} r={3.2} fill="none" stroke="#CFC8BA" strokeWidth={0.7} />
      ))}
      <circle cx={34} cy={31} r={4} fill="#F2EEE6" stroke="#CFC8BA" strokeWidth={0.7} />
      <circle cx={90} cy={31} r={4} fill="#F2EEE6" stroke="#CFC8BA" strokeWidth={0.7} />
    </g>
  </svg>
);

// Poses and outfit ride inside LiveMascot so they breathe and lean with her.
export function LawyerMascot() {
  const shown = useMediaQuery("(min-width: 721px)");

  return (
    <div data-mascot-slot className="fixed bottom-4 right-4 z-40 hidden min-[721px]:block" style={{ width: SIZE, height: SIZE }}>
      <LiveMascot directions={DIRECTIONS} reactions={REACTIONS} size={SIZE} label="NotifiedLaw mascot" active={shown} overlay={outfit} />
    </div>
  );
}
