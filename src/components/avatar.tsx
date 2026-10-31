import { useId } from "react";
import type { Plan } from "@/lib/data";
import { hueOf } from "@/lib/friend-view";

/** Crest colours by plan: a dark, light and dark stop for a metallic sweep. */
const CREST: Partial<Record<Plan, [string, string, string]>> = {
  Student: ["#7C808B", "#D3D6DD", "#8E929C"],
  Pro: ["#2C47A6", "#8FA8F0", "#3A56B8"],
  "Pro Max": ["#A9831A", "#F6DE84", "#C9A227"],
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * The plan crest: an arc outlining the top of a round picture, from lower left over the top to lower right, with a
 * small crown at its peak and a slow shimmer (off when reduced motion is asked for). Grey for Student, blue for
 * Senior Judicial (Pro), gold for Supreme Justice (Max); nothing without a plan. Sizes scale with the picture.
 */
export function Crest({ plan, size }: { plan?: Plan; size: number }) {
  const uid = useId().replace(/:/g, "");
  const c3 = plan && CREST[plan];
  if (!c3) return null;
  const sw = clamp(size * 0.055, 2, 5); // ring width
  const gap = clamp(size * 0.035, 1.5, 3); // space between picture and ring
  const em = clamp(size * 0.3, 9, 26); // crown width
  const pad = sw + gap + em * 0.5;
  const box = size + pad * 2;
  const c = box / 2;
  const r = size / 2 + gap + sw / 2;
  const at = (deg: number) => [c + r * Math.cos((deg * Math.PI) / 180), c + r * Math.sin((deg * Math.PI) / 180)].map((n) => n.toFixed(2)).join(" ");
  const arc = `M ${at(155)} A ${r} ${r} 0 1 1 ${at(25)}`;
  const h = em * 0.72;
  const x0 = c - em / 2;
  const y0 = c - r - h * 0.62;
  const crown = [[0, 1], [0.06, 0.18], [0.3, 0.52], [0.5, 0], [0.7, 0.52], [0.94, 0.18], [1, 1]]
    .map(([x, y], i) => `${i ? "L" : "M"} ${(x0 + x * em).toFixed(2)} ${(y0 + y * h).toFixed(2)}`).join(" ") + " Z";
  const metal = `crest-m-${uid}`;
  const shine = `crest-s-${uid}`;
  const mask = `crest-k-${uid}`;
  const crownFill = `crest-c-${uid}`;
  return (
    <svg aria-hidden width={box} height={box} viewBox={`0 0 ${box} ${box}`} className="pointer-events-none absolute overflow-visible" style={{ left: -pad, top: -pad }}>
      <defs>
        <linearGradient id={metal} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c3[0]} /><stop offset="0.5" stopColor={c3[1]} /><stop offset="1" stopColor={c3[2]} />
        </linearGradient>
        <linearGradient id={crownFill} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c3[2]} /><stop offset="1" stopColor={c3[0]} />
        </linearGradient>
        <linearGradient id={shine} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.35" stopColor="#fff" stopOpacity="0" /><stop offset="0.5" stopColor="#fff" stopOpacity="0.6" /><stop offset="0.65" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width={box} height={box}>
          <path d={arc} fill="none" stroke="#fff" strokeWidth={sw} strokeLinecap="round" />
          <path d={crown} fill="#fff" />
        </mask>
      </defs>
      <path d={arc} fill="none" stroke={`url(#${metal})`} strokeWidth={sw} strokeLinecap="round" />
      <path d={crown} fill={`url(#${crownFill})`} stroke="var(--surface)" strokeWidth={clamp(size * 0.02, 1, 2)} strokeLinejoin="round" paintOrder="stroke" />
      <g mask={`url(#${mask})`}>
        <rect className="nl-shimmer" x="0" y="0" width={box} height={box} fill={`url(#${shine})`} />
      </g>
    </svg>
  );
}

/** A profile or group picture, or coloured initials when there is none; a green dot when online; the plan crest when `plan` is given. */
export function Avatar({ id, name, src, size, online, group, plan }: { id: string; name: string; src?: string | null; size: number; online?: boolean; group?: boolean; plan?: Plan }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const hue = hueOf(id);
  return (
    <span aria-hidden className="relative shrink-0" style={{ width: size, height: size }}>
      {src
        // eslint-disable-next-line @next/next/no-img-element -- a 256 px WebP from our own route; next/image adds nothing
        ? <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" className={`size-full object-cover ${group ? "rounded-[30%]" : "rounded-full"}`} />
        : <span className={`grid size-full place-items-center font-semibold text-white ${group ? "rounded-[30%]" : "rounded-full"}`} style={{ fontSize: size * 0.36, background: `linear-gradient(145deg, hsl(${hue} 70% 58%), hsl(${(hue + 35) % 360} 65% 46%))` }}>{initials || "?"}</span>}
      {!group && <Crest plan={plan} size={size} />}
      {online && <span className="absolute bottom-0 right-0 size-3 rounded-full bg-green ring-2 ring-surface" />}
    </span>
  );
}

/** Photos larger than this are refused before upload; the server makes a 256 px WebP of the rest. */
const MAX_PHOTO = 8 * 1024 * 1024;

/** Uploads a photo as the request body. Returns the new picture's URL, or an error message. */
export async function uploadPhoto(url: string, file: File): Promise<{ avatar: string } | { error: string }> {
  if (file.size > MAX_PHOTO) return { error: "Choose a photo under 8 MB." };
  try {
    const r = await fetch(url, { method: "POST", body: file });
    const d = (await r.json().catch(() => ({}))) as { avatar?: string; error?: string };
    return r.ok && d.avatar ? { avatar: d.avatar } : { error: d.error ?? "The photo was not saved. Try again." };
  } catch {
    return { error: "You seem to be offline. Try again." };
  }
}
