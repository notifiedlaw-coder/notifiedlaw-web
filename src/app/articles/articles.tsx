"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chip, Empty, Page, Title } from "@/components/ui";
import { PreferredSource } from "@/components/preferred-source";

export type ArticleRow = {
  slug: string; title: string; summary: string; industry: string; area: string; author: string;
  mins: number; date: string | null; image: string; tags: { name: string; slug: string }[];
};
export type Initial = { q: string; industry: string; tag: string };

const fmt = (iso: string | null) => (iso ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" }).format(new Date(iso)) : "");
const meta = (a: ArticleRow) => [fmt(a.date), `${a.mins} min read`].filter(Boolean).join(" · ");

const SORTS = [["new", "Newest"], ["old", "Oldest"], ["short", "Quickest"]] as const;
const LENGTHS = [["any", "Any"], ["quick", "< 5 min"], ["mid", "5–10"], ["long", "10+"]] as const;
type Sort = (typeof SORTS)[number][0];
type Length = (typeof LENGTHS)[number][0];
const fits = (mins: number, l: Length) => l === "any" || (l === "quick" ? mins < 5 : l === "mid" ? mins >= 5 && mins <= 10 : mins > 10);

/** The cover photo, or a soft gradient with the title's initial when an article has none. */
function Cover({ a, eager }: { a: ArticleRow; eager?: boolean }) {
  return a.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={a.image} alt="" width={1280} height={720} loading={eager ? "eager" : "lazy"} decoding="async" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
  ) : (
    <span aria-hidden className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#C4552B]/25 via-[#af52de]/15 to-[#23305C]/25 text-5xl font-bold text-muted/50">{a.title[0]}</span>
  );
}

function TagPills({ tags, max = 3 }: { tags: ArticleRow["tags"]; max?: number }) {
  if (!tags.length) return null;
  return (
    <span className="flex flex-wrap gap-1.5 pt-0.5">
      {tags.slice(0, max).map((t) => <span key={t.slug} className="rounded-full bg-fill px-2 py-0.5 text-[11px] font-medium text-muted">{t.name}</span>)}
      {tags.length > max && <span className="px-1 py-0.5 text-[11px] text-faint">+{tags.length - max}</span>}
    </span>
  );
}

function Search({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div role="search" className="flex h-11 items-center gap-2.5 rounded-[14px] bg-fill px-3.5 transition-shadow focus-within:bg-surface focus-within:shadow-[0_0_0_3.5px_color-mix(in_srgb,var(--color-link)_28%,transparent),0_0_0_1px_var(--color-link)]">
      <svg aria-hidden width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-faint"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
      <input
        ref={ref}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search titles, topics and tags"
        aria-label="Search articles"
        maxLength={100}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        style={{ outline: "none" }}
        className="min-w-0 flex-1 bg-transparent text-[16px] outline-none focus-visible:outline-none placeholder:text-faint [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => { onChange(""); ref.current?.focus(); }} className="grid size-5 shrink-0 place-items-center rounded-full bg-faint/60 text-surface">
          <svg aria-hidden width="9" height="9" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m1.5 1.5 7 7M8.5 1.5l-7 7" /></svg>
        </button>
      )}
    </div>
  );
}

/** iOS-style segmented control. */
function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-[10px] bg-track/70 p-0.5">
      {options.map(([v, text]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)} className={`h-[30px] flex-1 rounded-[8px] px-2 text-[13px] font-medium transition-all ${value === v ? "bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.14)]" : "text-muted"}`}>{text}</button>
      ))}
    </div>
  );
}

/** One titled block in the sheet: a small caps label over an inset white card, as in iOS Settings. */
function Section({ label, children, flush }: { label: string; children: React.ReactNode; flush?: boolean }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="m-0 px-4 text-[12px] font-semibold uppercase tracking-[0.04em] text-faint">{label}</h3>
      <div className={`rounded-[14px] bg-surface ${flush ? "" : "p-3"}`}>{children}</div>
    </section>
  );
}

function FilterSheet({ onClose, onReset, count, canReset, children }: { onClose: () => void; onReset: () => void; count: number; canReset: boolean; children: React.ReactNode }) {
  const done = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    done.current?.focus();
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label="Filters">
      <div onClick={onClose} className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" style={{ animation: "tt-fade 0.25s ease-out" }} />
      <div className="relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-canvas shadow-[0_-8px_40px_rgba(0,0,0,0.25)] md:max-w-[460px] md:rounded-[28px]" style={{ animation: "tt-sheet 0.38s cubic-bezier(0.32, 0.72, 0, 1)" }}>
        <div aria-hidden className="mx-auto mt-2 h-[5px] w-9 shrink-0 rounded-full bg-faint/40 md:hidden" />
        <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4 pb-2 pt-2.5">
          <button type="button" onClick={onReset} disabled={!canReset} className="justify-self-start text-[17px] text-link disabled:opacity-35">Reset</button>
          <h2 className="m-0 text-[17px] font-semibold">Filters</h2>
          <button ref={done} type="button" onClick={onClose} className="justify-self-end text-[17px] font-semibold text-link">Done</button>
        </div>
        <div className="flex flex-col gap-5 overflow-y-auto overscroll-contain px-4 pb-4 pt-2">{children}</div>
        <div className="shrink-0 border-t border-edge/[0.08] bg-canvas/90 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
          <button type="button" onClick={onClose} className="h-[50px] w-full rounded-[14px] bg-blue text-[17px] font-semibold text-white transition-transform active:scale-[0.98]">
            {count === 0 ? "No articles" : `Show ${count} ${count === 1 ? "article" : "articles"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

const Check = () => <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-link"><path d="m3 8.5 3.2 3.2L13 4.5" /></svg>;
const Sliders = () => <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 6h8M15 6h2M3 14h2M9 14h8" /><circle cx="13" cy="6" r="2" /><circle cx="7" cy="14" r="2" /></svg>;

/** A removable pill for an active filter. */
function Pill({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <button type="button" onClick={onRemove} aria-label={`Remove filter ${typeof children === "string" ? children : ""}`} className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-link/10 pl-3 pr-2.5 text-[13px] font-medium text-link transition-transform active:scale-95">
      {children}
      <svg aria-hidden width="9" height="9" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m1.5 1.5 7 7M8.5 1.5l-7 7" /></svg>
    </button>
  );
}

export function Articles({ list, initial }: { list: ArticleRow[]; initial: Initial }) {
  const [q, setQ] = useState(initial.q);
  const [industry, setIndustry] = useState(initial.industry);
  const [tag, setTag] = useState(initial.tag);
  const [sort, setSort] = useState<Sort>("new");
  const [length, setLength] = useState<Length>("any");
  const [open, setOpen] = useState(false);

  const industries = useMemo(() => [...new Set(list.map((a) => a.industry).filter(Boolean))].sort(), [list]);
  const tags = useMemo(() => {
    const n = new Map<string, { name: string; n: number }>();
    for (const a of list) for (const t of a.tags) n.set(t.slug, { name: t.name, n: (n.get(t.slug)?.n ?? 0) + 1 });
    return [...n.entries()].sort((a, b) => b[1].n - a[1].n || a[1].name.localeCompare(b[1].name));
  }, [list]);

  // Keep the filters in the address bar so a filtered view can be shared or reopened.
  useEffect(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (industry !== "All") p.set("industry", industry);
    if (tag) p.set("tag", tag);
    window.history.replaceState(null, "", p.size ? `?${p}` : window.location.pathname);
  }, [q, industry, tag]);

  const needle = q.trim().toLowerCase();
  const shown = useMemo(() => {
    const out = list.filter((a) =>
      (industry === "All" || a.industry === industry) &&
      (!tag || a.tags.some((t) => t.slug === tag)) &&
      fits(a.mins, length) &&
      (!needle || [a.title, a.summary, a.author, a.area, a.industry, ...a.tags.map((t) => t.name)].join(" ").toLowerCase().includes(needle)));
    const time = (a: ArticleRow) => (a.date ? Date.parse(a.date) : 0);
    return out.sort(sort === "old" ? (a, b) => time(a) - time(b) : sort === "short" ? (a, b) => a.mins - b.mins : (a, b) => time(b) - time(a));
  }, [list, industry, tag, length, needle, sort]);

  const filters = (industry !== "All" ? 1 : 0) + (tag ? 1 : 0) + (length !== "any" ? 1 : 0) + (sort !== "new" ? 1 : 0);
  const active = (industry !== "All" ? 1 : 0) + (tag ? 1 : 0) + (length !== "any" ? 1 : 0) + (needle ? 1 : 0);
  const reset = () => { setQ(""); setIndustry("All"); setTag(""); setLength("any"); setSort("new"); };
  const featured = !active && sort === "new";
  const lead = featured ? shown[0] : undefined;
  const rest = featured ? shown.slice(1) : shown;

  return (
    <Page>
      <Title title="Articles" sub="Short explainers on Ghanaian law" right={<PreferredSource />} />
      {list.length === 0 ? (
        <Empty title="No articles yet">Articles appear here once they are published.</Empty>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="min-w-0 flex-1"><Search value={q} onChange={setQ} /></div>
              <button type="button" onClick={() => setOpen(true)} aria-label={`Filters${filters ? `, ${filters} active` : ""}`} aria-haspopup="dialog" className={`relative grid size-11 shrink-0 place-items-center rounded-full transition-transform active:scale-95 ${filters ? "bg-link text-white" : "bg-fill text-ink"}`}>
                <Sliders />
                {filters > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red px-1 text-[11px] font-bold leading-none text-white ring-2 ring-canvas">{filters}</span>}
              </button>
            </div>
            {filters > 0 && (
              <div className="scroll-row -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0">
                {industry !== "All" && <Pill onRemove={() => setIndustry("All")}>{industry}</Pill>}
                {tag && <Pill onRemove={() => setTag("")}>{tags.find(([slug]) => slug === tag)?.[1].name ?? tag}</Pill>}
                {length !== "any" && <Pill onRemove={() => setLength("any")}>{LENGTHS.find(([v]) => v === length)?.[1]} read</Pill>}
                {sort !== "new" && <Pill onRemove={() => setSort("new")}>{SORTS.find(([v]) => v === sort)?.[1]}</Pill>}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-1 text-[13px] text-muted" aria-live="polite">
            <span>{shown.length} {shown.length === 1 ? "article" : "articles"}{active ? " match" : ""}</span>
            {active > 0 && <button type="button" onClick={reset} className="font-medium text-link">Clear all</button>}
          </div>

          {open && (
            <FilterSheet onClose={() => setOpen(false)} onReset={reset} count={shown.length} canReset={filters > 0}>
              <Section label="Sort by"><Segmented label="Sort" value={sort} options={SORTS} onChange={setSort} /></Section>
              <Section label="Reading time"><Segmented label="Reading time" value={length} options={LENGTHS} onChange={setLength} /></Section>
              {industries.length > 0 && (
                <Section label="Industry" flush>
                  {["All", ...industries].map((i, n) => (
                    <button key={i} type="button" role="radio" aria-checked={industry === i} onClick={() => setIndustry(i)} className={`flex w-full items-center justify-between px-4 py-3 text-left text-[16px] ${n ? "border-t border-edge/[0.08]" : ""}`}>
                      <span>{i === "All" ? "All industries" : i}</span>
                      {industry === i && <Check />}
                    </button>
                  ))}
                </Section>
              )}
              {tags.length > 0 && (
                <Section label="Topics">
                  <div className="flex flex-wrap gap-2">
                    {tags.map(([slug, t]) => <Chip key={slug} on={tag === slug} onClick={() => setTag(tag === slug ? "" : slug)}>{t.name}</Chip>)}
                  </div>
                </Section>
              )}
            </FilterSheet>
          )}

          {shown.length === 0 ? (
            <Empty title="No matches">Nothing fits those filters. Try a different word or clear the filters.</Empty>
          ) : (
            <>
              {lead && (
                <Link href={`/articles/${lead.slug}`} className="group block overflow-hidden rounded-[26px] bg-surface shadow-card transition-transform duration-300 active:scale-[0.985] sm:grid sm:grid-cols-[1.35fr_1fr]" style={{ textDecoration: "none", color: "inherit" }}>
                  <span className="relative block aspect-video overflow-hidden sm:aspect-auto sm:min-h-[300px]"><Cover a={lead} eager /></span>
                  <span className="flex flex-col gap-2 p-5 sm:justify-center sm:p-8">
                    <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#C4552B]">Featured{lead.industry ? ` · ${lead.industry}` : ""}</span>
                    <span className="text-balance text-[24px] font-bold leading-[1.15] tracking-[-0.022em] sm:text-[28px]">{lead.title}</span>
                    {lead.summary && <span className="line-clamp-3 text-[15px] leading-snug text-muted">{lead.summary}</span>}
                    <TagPills tags={lead.tags} max={4} />
                    <span className="flex items-center justify-between pt-1 text-xs text-faint">
                      <span>{meta(lead)}</span>
                      <span className="font-semibold text-link">Read <span aria-hidden>→</span></span>
                    </span>
                  </span>
                </Link>
              )}
              {rest.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((a) => (
                    <Link key={a.slug} href={`/articles/${a.slug}`} className="group flex flex-col overflow-hidden rounded-[22px] bg-surface shadow-card transition-transform duration-300 active:scale-[0.98]" style={{ textDecoration: "none", color: "inherit" }}>
                      <span className="relative block aspect-video overflow-hidden"><Cover a={a} /></span>
                      <span className="flex flex-1 flex-col gap-1.5 p-4">
                        {a.industry && <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#C4552B]">{a.industry}</span>}
                        <span className="text-balance text-[18px] font-semibold leading-snug tracking-[-0.01em]">{a.title}</span>
                        {a.summary && <span className="line-clamp-2 text-[14px] leading-snug text-muted">{a.summary}</span>}
                        <TagPills tags={a.tags} />
                        <span className="mt-auto pt-1 text-xs text-faint">{meta(a)}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </Page>
  );
}
