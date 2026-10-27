import { DEMO_USER } from "@/lib/data";

// Faint tiled per-user mark so leaked screenshots trace back to an account.
// Demo-only: swap the label for the signed-in user's email once auth lands.
export function Watermark() {
  const label = DEMO_USER.name;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><text x="160" y="100" text-anchor="middle" transform="rotate(-24 160 100)" font-family="sans-serif" font-size="14" font-weight="600" fill="#808080" fill-opacity="0.16">${label} · NotifiedLaw</text></svg>`;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 select-none"
      style={{ backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")` }}
    />
  );
}
