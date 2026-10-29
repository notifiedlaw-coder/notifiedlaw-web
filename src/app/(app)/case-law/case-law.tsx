"use client";

import Link from "next/link";
import { useState } from "react";
import { Chevron, Chip, Empty, Page, SearchField, Segmented, Title } from "@/components/ui";
import type { CmsCase } from "@/lib/cms";

const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());

/** Case briefs published from Notion. */
export function CaseLaw({ cases: all }: { cases: CmsCase[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"A–Z" | "Z–A">("A–Z");
  const [court, setCourt] = useState("All");
  const courts = [...new Set(all.map((c) => titleCase(c.court)).filter(Boolean))];
  const needle = q.toLowerCase();
  const cases = all.filter((c) => (court === "All" || titleCase(c.court) === court) && (c.title + c.cite).toLowerCase().includes(needle))
    .sort((a, b) => (sort === "A–Z" ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)));
  const row = "flex items-center gap-3 border-t border-edge/[0.06] px-4 py-3 first:border-0 hover:bg-hover";

  return (
    <Page>
      <Title title="Case Law" sub="Case Briefs on Cases" />
      {all.length === 0 ? (
        <Empty title="No case briefs yet">Case briefs appear here once they are published.</Empty>
      ) : (
        <>
          <SearchField value={q} onChange={setQ} placeholder="Search by party or citation" />
          <div className="scroll-row flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Sort</span>
            <Segmented options={["A–Z", "Z–A"] as const} value={sort} onChange={setSort} />
            {courts.length > 0 && <span className="mx-1 h-4 w-px bg-edge/10" />}
            {courts.length > 0 && ["All", ...courts].map((f) => <Chip key={f} on={court === f} onClick={() => setCourt(f)}>{f === "All" ? "All courts" : f}</Chip>)}
          </div>
          <div role="status" className="text-xs text-muted">{cases.length} {cases.length === 1 ? "case" : "cases"}</div>
          <div className="overflow-hidden rounded-xl bg-surface shadow-card">
            {cases.map((c) => (
              <Link key={c.id} href={`/case-law/${c.slug}`} className={row} style={{ textDecoration: "none", color: "inherit" }}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{c.title}</span>
                  <span className="truncate text-xs text-muted">{[c.cite, titleCase(c.court), c.courses.join(", ")].filter(Boolean).join(" · ")}</span>
                </span>
                <Chevron />
              </Link>
            ))}
            {cases.length === 0 && <div className="p-6 text-center text-sm text-muted">Nothing matches “{q}”. Try a party name or citation.</div>}
          </div>
        </>
      )}
    </Page>
  );
}
