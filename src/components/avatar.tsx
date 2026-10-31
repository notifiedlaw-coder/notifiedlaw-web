import { hueOf } from "@/lib/friend-view";

/** A profile or group picture, or coloured initials when there is none; a green dot when online. */
export function Avatar({ id, name, src, size, online, group }: { id: string; name: string; src?: string | null; size: number; online?: boolean; group?: boolean }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const hue = hueOf(id);
  return (
    <span aria-hidden className="relative shrink-0" style={{ width: size, height: size }}>
      {src
        // eslint-disable-next-line @next/next/no-img-element -- a 256 px WebP from our own route; next/image adds nothing
        ? <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" className={`size-full object-cover ${group ? "rounded-[30%]" : "rounded-full"}`} />
        : <span className={`grid size-full place-items-center font-semibold text-white ${group ? "rounded-[30%]" : "rounded-full"}`} style={{ fontSize: size * 0.36, background: `linear-gradient(145deg, hsl(${hue} 70% 58%), hsl(${(hue + 35) % 360} 65% 46%))` }}>{initials || "?"}</span>}
      {online && <span className="absolute bottom-0 right-0 size-3 rounded-full bg-green ring-2 ring-surface" />}
    </span>
  );
}
