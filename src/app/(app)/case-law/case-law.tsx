"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { BookmarkButton, useBookmarks } from "@/components/bookmark";
import { usePlan } from "@/components/plan";
import { CompareSheet } from "./compare-sheet";
import { Chevron, Page, SearchField, Segmented, Title } from "@/components/ui";
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

const isJurisdiction = (name: string) => name.trim().toLowerCase() === "jurisdiction";

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
export function CaseLaw({ cases: all, columns: schema, bookmarks }: { cases: CmsCase[]; columns: CmsColumn[]; bookmarks: string[] | null }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"A–Z" | "Z–A">("A–Z");
  const marks = useBookmarks(bookmarks);
  const router = useRouter();
  const { paid } = usePlan();
  // Compare: pick up to two cases, then open the AI comparison.
  const [comparing, setComparing] = useState(false);
  const [pick, setPick] = useState<string[]>([]);
  const [sheet, setSheet] = useState(false);
  const startCompare = () => {
    if (!marks.marked) return router.push("/login");
    if (!paid) return router.push("/plans");
    setComparing((v) => !v);
    setPick([]);
  };
  const togglePick = (id: string) => setPick((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 2 ? [...p, id] : p));
  const [saved, setSaved] = useState(false); // only the bookmarked cases
  const cols = columnsFor(all, schema);
  // The jurisdiction filter starts on Ghana.
  const [picked, setPicked] = useState<Record<string, string[]>>(() => {
    const col = cols.find((c) => isJurisdiction(c.name));
    const ghana = col?.options.find((o) => o.trim().toLowerCase() === "ghana");
    return col && ghana ? { [col.name]: [ghana] } : {};
  });
  const filters = cols.filter((c) => c.filter && c.options.length);
  const active = Object.values(picked).reduce((n, v) => n + v.length, 0);
  const needle = q.toLowerCase();
  // Within a column any picked option matches; across columns every column must.
  const cases = all
    .filter((c) => !saved || marks.marked?.has(c.id))
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
      <Title title="Case Law" sub="Case Briefs" />
      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={q} onChange={setQ} placeholder="Search cases, citations, courts" />
        <Segmented options={["A–Z", "Z–A"] as const} value={sort} onChange={setSort} />
        <button type="button" aria-pressed={saved} onClick={() => (marks.marked ? setSaved((v) => !v) : marks.toggle(""))}
          className={`flex h-8 items-center gap-1.5 rounded-full border-0 px-3 text-xs font-medium ${saved ? "bg-strong text-strong-fg" : "bg-surface text-ink shadow-[0_0_0_0.5px_var(--hairline)]"}`}>
          Bookmarks{marks.marked?.size ? ` · ${marks.marked.size}` : ""}
        </button>
        <button type="button" aria-pressed={comparing} onClick={startCompare}
          className={`flex h-8 items-center gap-1.5 rounded-full border-0 px-3 text-xs font-medium ${comparing ? "bg-strong text-strong-fg" : "bg-surface text-ink shadow-[0_0_0_0.5px_var(--hairline)]"}`}>
          {comparing ? "Cancel compare" : "Compare cases"}
        </button>
      </div>
      {marks.error && <p role="alert" className="m-0 text-xs text-red">{marks.error}</p>}
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
          comparing ? (
            <button key={c.id} type="button" role="checkbox" aria-checked={pick.includes(c.id)} disabled={!pick.includes(c.id) && pick.length >= 2} onClick={() => togglePick(c.id)}
              className="flex w-full items-center gap-3 border-0 border-t border-edge/[0.06] bg-transparent px-4 py-3 text-left first:border-0 hover:bg-hover disabled:opacity-40">
              <Pick n={pick.indexOf(c.id) + 1} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{c.title}</span>
                <span className="truncate text-xs text-muted">{cols.map((col) => cell(c, col)).filter(Boolean).join(" · ")}</span>
              </span>
            </button>
          ) : (
          <div key={c.id} className="flex items-center border-t border-edge/[0.06] first:border-0 hover:bg-hover">
            <Link href={`/case-law/${c.slug}`} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{c.title}</span>
                <span className="truncate text-xs text-muted">{cols.map((col) => cell(c, col)).filter(Boolean).join(" · ")}</span>
              </span>
              <Chevron />
            </Link>
            <span className="px-1.5"><BookmarkButton on={!!marks.marked?.has(c.id)} onClick={() => marks.toggle(c.id)} title={c.title} /></span>
          </div>
          )
        ))}
        {cases.length === 0 && <NoMatch q={q} none={!all.length} saved={saved} />}
      </div>

      {/* Wide screens: Notion's table, a filter in each select column's header. */}
      <div className="hidden rounded-xl bg-surface shadow-card lg:block">
        <div role="row" className="grid items-center gap-4 border-b border-edge/10 px-4 py-1.5 text-xs font-semibold text-muted" style={comparing ? { gridTemplateColumns: `28px ${grid.gridTemplateColumns}` } : grid}>
          {comparing && <span aria-hidden />}
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
          comparing ? (
            <button key={c.id} type="button" role="checkbox" aria-checked={pick.includes(c.id)} disabled={!pick.includes(c.id) && pick.length >= 2} onClick={() => togglePick(c.id)}
              className="grid w-full items-center gap-4 border-0 border-t border-edge/[0.06] bg-transparent py-3 pl-4 pr-4 text-left text-[13px] first:border-0 last:rounded-b-xl hover:bg-hover disabled:opacity-40" style={{ gridTemplateColumns: `28px ${grid.gridTemplateColumns}` }}>
              <Pick n={pick.indexOf(c.id) + 1} />
              <span className="min-w-0 text-sm font-medium">{c.title}</span>
              {cols.map((col) => <span key={col.name} className="min-w-0 text-muted">{cell(c, col) || "—"}</span>)}
            </button>
          ) : (
          <div key={c.id} className="relative border-t border-edge/[0.06] first:border-0 last:rounded-b-xl hover:bg-hover">
            <Link href={`/case-law/${c.slug}`} role="row" className="grid items-center gap-4 py-3 pl-4 pr-14 text-[13px]" style={{ ...grid, textDecoration: "none", color: "inherit" }}>
              <span role="cell" className="min-w-0 text-sm font-medium">{c.title}</span>
              {cols.map((col) => <span key={col.name} role="cell" className="min-w-0 text-muted">{cell(c, col) || "—"}</span>)}
            </Link>
            <span className="absolute right-3 top-1/2 -translate-y-1/2"><BookmarkButton on={!!marks.marked?.has(c.id)} onClick={() => marks.toggle(c.id)} title={c.title} /></span>
          </div>
          )
        ))}
        {cases.length === 0 && <NoMatch q={q} none={!all.length} saved={saved} />}
      </div>
      {comparing && <div aria-hidden className="h-14" />}
      {comparing && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div role="status" className="flex w-full max-w-[460px] items-center gap-3 rounded-[22px] bg-surface/90 py-2.5 pl-4 pr-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.22),0_0_0_0.5px_var(--hairline)] backdrop-blur-xl">
            <span className="min-w-0 flex-1 text-[14px]">
              {pick.length === 0 ? "Choose two cases to compare" : pick.length === 1 ? "Choose one more case" : "Ready to compare"}
              <span className="block text-xs text-muted">{pick.length} of 2 selected</span>
            </span>
            <button type="button" disabled={pick.length < 2} onClick={() => setSheet(true)}
              className="h-10 shrink-0 rounded-full border-0 bg-blue px-5 text-[15px] font-semibold text-white transition-transform active:scale-[0.97] disabled:opacity-40">Compare</button>
          </div>
        </div>
      )}
      {sheet && pick.length === 2 && <CompareSheet a={pick[0]} b={pick[1]} onClose={() => setSheet(false)} />}
    </Page>
  );
}

/** The selection circle in compare mode: empty, or filled with the case's place in the pair (1 or 2). */
const Pick = ({ n }: { n: number }) => (
  <span aria-hidden className={`flex size-[22px] shrink-0 items-center justify-center rounded-full text-xs font-semibold ${n ? "bg-blue text-white" : "border-[1.5px] border-faint/70"}`}>{n || ""}</span>
);

// With no briefs published yet the table and its filters still show, with this in place of rows.
const NoMatch = ({ q, none, saved }: { q: string; none: boolean; saved: boolean }) => (
  <div className="p-6 text-center text-sm text-muted">{none ? "No case briefs yet. They appear here once they are published." : q ? <>Nothing matches “{q}”. Try a party name or citation.</> : saved ? "No bookmarked cases here yet. Tap the bookmark on a case to keep it." : "No cases match these filters."}</div>
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
