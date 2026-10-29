"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Chevron, Empty, Page, SearchField, Segmented, Title } from "@/components/ui";
import type { CmsCase, CmsColumn } from "@/lib/cms";

const SMALL = new Set(["of", "and", "the", "in", "on", "for", "at", "to"]);
/** Notion's capitals as words: "COURT OF APPEAL" reads "Court of Appeal"; two-letter names such as UK and US stay. */
const label = (s: string) => s.trim().split(/\s+/).map((w, i) => {
  const l = w.toLowerCase();
  if (/^[A-Z]{2}$/.test(w) && !SMALL.has(l)) return w;
  return i > 0 && SMALL.has(l) ? l : l.charAt(0).toUpperCase() + l.slice(1);
}).join(" ");

/** The order of the columns in the Notion table view; Notion's API gives them in another. Others follow these. */
const ORDER = ["course", "court", "citation", "jurisdiction"];
const FILTERED = new Set(["select", "multi_select", "status"]);

type Col = { name: string; options: string[]; filter: boolean };

/**
 * The columns besides the case name, as the last Notion sync read them; before that sync, as the rows show them.
 * A select column's options are Notion's, in Notion's order, then any value a row holds that the column no longer lists.
 */
function columnsFor(cases: CmsCase[], schema: CmsColumn[]): Col[] {
  const names = schema.length ? schema.filter((c) => c.type !== "title").map((c) => c.name) : [...new Set(cases.flatMap((c) => Object.keys(c.cells)))];
  const rank = (n: string) => { const i = ORDER.indexOf(n.toLowerCase()); return i < 0 ? ORDER.length : i; };
  return names.sort((a, b) => rank(a) - rank(b)).map((name) => {
    const s = schema.find((c) => c.name === name);
    const used = cases.flatMap((c) => c.cells[name] ?? []);
    return {
      name,
      options: [...new Set([...(s?.options ?? []), ...used])],
      filter: s ? FILTERED.has(s.type) : !/citation/i.test(name),
    };
  });
}

/** Case briefs published from Notion, in a table with Notion's columns; each select column's header filters by its options. */
export function CaseLaw({ cases: all, columns: schema }: { cases: CmsCase[]; columns: CmsColumn[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"A–Z" | "Z–A">("A–Z");
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const cols = columnsFor(all, schema);
  const filters = cols.filter((c) => c.filter && c.options.length);
  const active = Object.values(picked).reduce((n, v) => n + v.length, 0);
  const needle = q.toLowerCase();
  // Within a column any picked option matches; across columns every column must.
  const cases = all
    .filter((c) => Object.entries(picked).every(([col, vals]) => !vals.length || vals.some((v) => c.cells[col]?.includes(v))))
    .filter((c) => [c.title, ...Object.values(c.cells).flat()].join(" ").toLowerCase().includes(needle))
    .sort((a, b) => (sort === "A–Z" ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)));
  const setCol = (col: string, vals: string[]) => setPicked((p) => ({ ...p, [col]: vals }));
  const count = (col: string, v: string) => all.filter((c) => c.cells[col]?.includes(v)).length;
  // Option names are Notion's capitals, so they are relabelled; text such as a citation is shown as written.
  const cell = (c: CmsCase, col: Col) => (c.cells[col.name] ?? []).map(col.filter ? label : (v) => v).join(", ");
  const grid = { gridTemplateColumns: `minmax(220px, 2.2fr) ${cols.map(() => "minmax(110px, 1fr)").join(" ")}` };

  return (
    <Page max={1120}>
      <Title title="Case Law" sub="Case Briefs on Cases" />
      {all.length === 0 ? (
        <Empty title="No case briefs yet">Case briefs appear here once they are published.</Empty>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <SearchField value={q} onChange={setQ} placeholder="Search cases, citations, courts" />
            <Segmented options={["A–Z", "Z–A"] as const} value={sort} onChange={setSort} />
          </div>
          {/* Phones and tablets: the column filters as pills above a list. */}
          {filters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 lg:hidden">
              {filters.map((c) => <ColumnFilter key={c.name} col={c} picked={picked[c.name] ?? []} onPick={(v) => setCol(c.name, v)} count={(v) => count(c.name, v)} pill />)}
            </div>
          )}
          <div role="status" className="-mt-2 flex items-center gap-2 text-xs text-muted">
            {cases.length} {cases.length === 1 ? "case" : "cases"}
            {active > 0 && <button type="button" onClick={() => setPicked({})} className="font-medium text-blue">Clear filters</button>}
          </div>

          <div className="overflow-hidden rounded-xl bg-surface shadow-card lg:hidden">
            {cases.map((c) => (
              <Link key={c.id} href={`/case-law/${c.slug}`} className="flex items-center gap-3 border-t border-edge/[0.06] px-4 py-3 first:border-0 hover:bg-hover" style={{ textDecoration: "none", color: "inherit" }}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{c.title}</span>
                  <span className="truncate text-xs text-muted">{cols.map((col) => cell(c, col)).filter(Boolean).join(" · ")}</span>
                </span>
                <Chevron />
              </Link>
            ))}
            {cases.length === 0 && <NoMatch q={q} />}
          </div>

          {/* Wide screens: Notion's table, a filter in each select column's header. */}
          <div className="hidden rounded-xl bg-surface shadow-card lg:block">
            <div role="row" className="grid items-center gap-4 border-b border-edge/10 px-4 py-1.5 text-xs font-semibold text-muted" style={grid}>
              <span role="columnheader" className="py-1.5">Case Name</span>
              {cols.map((c) => (
                <span key={c.name} role="columnheader" className="min-w-0">
                  {c.filter && c.options.length
                    ? <ColumnFilter col={c} picked={picked[c.name] ?? []} onPick={(v) => setCol(c.name, v)} count={(v) => count(c.name, v)} />
                    : <span className="block py-1.5">{label(c.name)}</span>}
                </span>
              ))}
            </div>
            {cases.map((c) => (
              <Link key={c.id} href={`/case-law/${c.slug}`} role="row" className="grid items-center gap-4 border-t border-edge/[0.06] px-4 py-3 text-[13px] first-of-type:border-0 last:rounded-b-xl hover:bg-hover" style={{ ...grid, textDecoration: "none", color: "inherit" }}>
                <span role="cell" className="min-w-0 text-sm font-medium">{c.title}</span>
                {cols.map((col) => <span key={col.name} role="cell" className="min-w-0 text-muted">{cell(c, col) || "—"}</span>)}
              </Link>
            ))}
            {cases.length === 0 && <NoMatch q={q} />}
          </div>
        </>
      )}
    </Page>
  );
}

const NoMatch = ({ q }: { q: string }) => (
  <div className="p-6 text-center text-sm text-muted">{q ? <>Nothing matches “{q}”. Try a party name or citation.</> : "No cases match these filters."}</div>
);

/** A column's filter: a button (a header, or a pill on small screens) opening a checklist of the column's Notion options. */
function ColumnFilter({ col, picked, onPick, count, pill }: { col: Col; picked: string[]; onPick: (v: string[]) => void; count: (v: string) => number; pill?: boolean }) {
  const [open, setOpen] = useState(false);
  const [end, setEnd] = useState(false); // the list opens leftwards when it would run off the right of the screen
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", key); };
  }, [open]);
  const on = picked.length > 0;
  const toggle = (v: string) => onPick(picked.includes(v) ? picked.filter((x) => x !== v) : [...picked, v]);
  const name = label(col.name);
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => { setEnd((box.current?.getBoundingClientRect().left ?? 0) + 270 > window.innerWidth); setOpen((o) => !o); }} aria-expanded={open} aria-haspopup="true"
        aria-label={`Filter by ${name}${on ? `, ${picked.length} chosen` : ""}`}
        className={pill
          ? `flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium ${on ? "bg-strong text-strong-fg" : "bg-surface text-ink shadow-[0_0_0_0.5px_var(--hairline)]"}`
          : `-mx-2 flex max-w-full items-center gap-1 rounded-md px-2 py-1.5 hover:bg-fill ${on ? "text-blue" : ""}`}>
        <span className="truncate">{name}{on && pill ? ` · ${picked.length === 1 ? label(picked[0]) : picked.length}` : ""}</span>
        {on && !pill && <span className="rounded-full bg-blue px-1.5 text-[10px] leading-4 text-white">{picked.length}</span>}
        <Icon name="chevron" size={12} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="group" aria-label={`${name} options`}
          className={`absolute ${end ? "right-0" : "left-0"} top-full z-30 mt-1.5 w-[min(260px,calc(100vw-40px))] rounded-[14px] bg-surface p-1.5 text-[13px] font-normal text-ink shadow-[0_12px_36px_rgba(0,0,0,0.18),0_0_0_0.5px_var(--hairline)] animate-[tt-pop_140ms_ease-out]`}>
          <button type="button" onClick={() => onPick([])} className={`flex min-h-10 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left hover:bg-fill ${on ? "" : "font-semibold"}`}>
            <Box on={!on} />All
          </button>
          <div className="my-1 h-px bg-edge/10" />
          <div className="max-h-[280px] overflow-y-auto overscroll-contain">
            {col.options.map((v) => (
              <button key={v} type="button" role="checkbox" aria-checked={picked.includes(v)} onClick={() => toggle(v)}
                className="flex min-h-10 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left hover:bg-fill">
                <Box on={picked.includes(v)} />
                <span className="min-w-0 flex-1">{label(v)}</span>
                <span className="text-xs tabular-nums text-muted">{count(v)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const Box = ({ on }: { on: boolean }) => (
  <span aria-hidden className={`flex size-[18px] shrink-0 items-center justify-center rounded-[5px] ${on ? "bg-blue text-white" : "shadow-[inset_0_0_0_1.5px_var(--hairline)]"}`}>
    {on && <Icon name="tick" size={12} />}
  </span>
);
