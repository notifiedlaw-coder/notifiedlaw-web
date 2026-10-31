"use client";

import Link from "next/link";
import { BADGES, type Treatment } from "@/lib/content";
import { LEVELS, LEVEL_LABEL, type Level } from "@/lib/data";
import { Icon } from "./icons";

export const cardCls = "rounded-[18px] border border-edge/10 bg-surface";

export function Page({ children, max = 1080 }: { children: React.ReactNode; max?: number }) {
  return (
    <div className="mx-auto flex w-full flex-col gap-7 px-[18px] pb-8 pt-5 md:px-8 md:pb-10 md:pt-7 lg:px-14 lg:pb-14 lg:pt-10" style={{ maxWidth: max }}>
      {children}
    </div>
  );
}

/**
 * Intro line and actions for a page. The page name itself lives in the top bar, so the heading here is
 * visually hidden: it stays for screen readers and search engines, which need one h1 per page.
 */
export function Title({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
      <h1 className="sr-only">{title}</h1>
      {/* Phones: the intro takes the full width and the actions wrap below it, rather than squeezing it into a column. */}
      {sub && <p className="m-0 w-full min-w-0 max-w-[600px] text-pretty text-[17px] leading-normal text-muted sm:w-auto sm:flex-1">{sub}</p>}
      {right}
    </div>
  );
}

export function Eyebrow({ children, color = "var(--faint)" }: { children: React.ReactNode; color?: string }) {
  return (
    <div className="text-[12px] font-semibold uppercase tracking-[0.08em]" style={{ color }}>
      {children}
    </div>
  );
}

export function Segmented<T extends string>({
  options, value, onChange, labels,
}: { options: readonly T[]; value: T; onChange: (v: T) => void; labels?: Record<string, string> }) {
  return (
    <div className="nl-type-fixed flex max-w-full overflow-x-auto rounded-xl bg-fill p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={o === value}
          onClick={() => onChange(o)}
          className={`h-10 flex-1 whitespace-nowrap rounded-[9px] px-4 text-[15px] ${
            o === value ? "bg-surface font-bold shadow-[0_1px_2px_rgba(22,26,38,0.08)]" : "font-medium text-ink/80"
          }`}
        >
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}

/** Level picker: one dropdown on every screen (Hick's law: one control, not six tabs). */
export function LevelSelect({ value, onChange }: { value: Level; onChange: (v: Level) => void }) {
  return (
    <label className="relative">
      <span className="sr-only">Level</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Level)}
        className="h-11 appearance-none rounded-[10px] border border-edge/20 bg-surface py-0 pl-3.5 pr-9 text-[16px] font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-blue"
      >
        {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
      </select>
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden>
        <path d="m3 6 5 5 5-5" />
      </svg>
    </label>
  );
}

export function Chip({ on, children, onClick }: { on?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`nl-type-fixed h-10 shrink-0 rounded-full border px-4 text-[15px] font-semibold ${on ? "border-strong bg-strong text-strong-fg" : "border-edge/15 bg-surface text-ink hover:bg-hover"}`}
    >
      {children}
    </button>
  );
}

export function Badge({ kind, label }: { kind: Treatment; label?: string }) {
  const b = BADGES[kind];
  return (
    <span className="whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-bold" style={{ background: b.bg, color: b.fg }}>
      {label ?? b.label}
    </span>
  );
}

export function Btn({
  children, onClick, href, tone = "primary", disabled, className = "", type = "button",
}: { children: React.ReactNode; onClick?: () => void; href?: string; tone?: "primary" | "plain" | "dark"; disabled?: boolean; className?: string; type?: "button" | "submit" }) {
  const tones = {
    primary: "bg-blue text-white hover:bg-blue-press",
    plain: "border border-edge/20 bg-transparent text-ink hover:bg-edge/[0.04]",
    dark: "bg-strong text-strong-fg",
  };
  // One pill size everywhere: 44 px tall, 16 px text, a comfortable target on phones and desktops alike.
  const cls = `nl-type-fixed inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-5 text-[16px] font-semibold disabled:opacity-50 ${tones[tone]} ${className}`;
  if (href)
    return (
      <Link href={href} className={cls} style={{ textDecoration: "none", color: tone === "plain" ? "var(--ink)" : "#fff" }}>
        {children}
      </Link>
    );
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

/** Dimmed overlay with an upgrade prompt, used for plan-gated panels. */
export function Gate({
  title, body, cta, color = "#23305C", href = "/plans",
}: { title: string; body: string; cta: string; color?: string; href?: string }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/80 p-6 backdrop-blur-sm">
      <div className="flex max-w-[280px] flex-col items-center gap-2.5 text-center">
        <div className="flex size-11 items-center justify-center rounded-xl text-white" style={{ background: color }}>
          <Icon name="lock" size={20} />
        </div>
        <div className="font-display text-[24px] leading-tight">{title}</div>
        <div className="text-[15px] leading-snug text-muted">{body}</div>
        <Btn href={href}>{cta}</Btn>
      </div>
    </div>
  );
}

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex h-12 flex-1 items-center gap-2.5 rounded-2xl border border-edge/15 bg-surface px-4 md:h-14">
      <Icon name="search" size={18} className="text-faint" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={100}
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent text-[17px] outline-none"
      />
    </div>
  );
}

export function Initials({ name, color, size = 28 }: { name: string; color: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
    >
      {name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
    </span>
  );
}

export const Chevron = () => (
  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="shrink-0 text-faint opacity-60" aria-hidden>
    <path d="m6 3 5 5-5 5" />
  </svg>
);

/** Shown where a page has no published content yet. */
export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className={`${cardCls} flex flex-col items-center gap-1.5 px-6 py-12 text-center`}>
      <div className="font-display text-[26px] leading-tight">{title}</div>
      {children && <div className="max-w-[420px] text-[16px] text-muted">{children}</div>}
    </div>
  );
}
