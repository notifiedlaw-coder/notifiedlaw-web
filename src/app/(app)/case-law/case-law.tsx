"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Chevron, Chip, Page, SearchField, Segmented, Title } from "@/components/ui";
import { CASE_LIST, STATUTE_LIST } from "@/lib/content";

export function CaseLaw() {
  const [tab, setTab] = useState<"Cases" | "Legislation">("Cases");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"Recent" | "A–Z">("Recent");
  const [filter, setFilter] = useState("All");
  const needle = q.toLowerCase();

  const cases = CASE_LIST.filter((c) => (filter === "All" || c.court === filter) && (c.title + c.cite).toLowerCase().includes(needle))
    .sort((a, b) => (sort === "Recent" ? b.year - a.year : a.title.localeCompare(b.title)));
  const statutes = STATUTE_LIST.filter((s) => (filter === "All" || s.group === filter) && (s.title + s.ref).toLowerCase().includes(needle));
  const filters = tab === "Cases" ? ["All", "Supreme Court", "Court of Appeal"] : ["All", "Constitution", "Acts of Parliament", "Decrees & PNDC Laws"];
  const count = tab === "Cases" ? cases.length : statutes.length;
  const row = "flex items-center gap-3 border-t border-edge/[0.06] px-4 py-3 first:border-0 hover:bg-hover";

  return (
    <Page>
      <Title title="Case Law" sub="Ghanaian cases and legislation, with case briefs and good-law checks"
        right={<Segmented options={["Cases", "Legislation"] as const} value={tab} onChange={(t) => { setTab(t); setFilter("All"); }} />} />
      <div className="flex gap-2.5">
        <SearchField value={q} onChange={setQ} placeholder={tab === "Cases" ? "Search by party, citation or topic" : "Search by title or Act number"} />
        <Link href="/search" className="hidden h-9 items-center rounded-[10px] bg-surface px-3 text-[13px] shadow-[0_0_0_0.5px_var(--hairline)] sm:flex">Search inside judgments</Link>
      </div>
      <div className="scroll-row flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Sort</span>
        {(["Recent", "A–Z"] as const).map((s) => <Chip key={s} on={sort === s} onClick={() => setSort(s)}>{s}</Chip>)}
        <span className="mx-1 h-4 w-px bg-edge/10" />
        {filters.map((f) => <Chip key={f} on={filter === f} onClick={() => setFilter(f)}>{f === "All" ? (tab === "Cases" ? "All courts" : "All types") : f}</Chip>)}
      </div>
      <div className="text-xs text-muted">{count} {tab === "Cases" ? (count === 1 ? "case" : "cases") : count === 1 ? "instrument" : "instruments"}</div>
      <div className="overflow-hidden rounded-xl bg-surface shadow-card">
        {tab === "Cases"
          ? cases.map((c) => {
              const inner = <><span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-sm font-medium">{c.title}</span><span className="truncate text-xs text-muted">{c.cite} · {c.court} · {c.area}</span></span>{c.slug && <Badge kind="good" />}<Chevron /></>;
              return c.slug ? <Link key={c.title} href={`/case-law/${c.slug}`} className={row} style={{ textDecoration: "none", color: "inherit" }}>{inner}</Link> : <div key={c.title} className={row}>{inner}</div>;
            })
          : statutes.map((s) => {
              const inner = <><span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-sm font-medium">{s.title}</span><span className="truncate text-xs text-muted">{s.ref} · {s.group} · {s.year}</span></span><Badge kind={s.kind} label={s.note || undefined} /><Chevron /></>;
              return s.slug ? <Link key={s.title} href={`/legislation/${s.slug}`} className={row} style={{ textDecoration: "none", color: "inherit" }}>{inner}</Link> : <div key={s.title} className={row}>{inner}</div>;
            })}
        {count === 0 && <div className="p-6 text-center text-sm text-muted">Nothing matches “{q}”. Try a party name, citation or Act number.</div>}
      </div>
    </Page>
  );
}
