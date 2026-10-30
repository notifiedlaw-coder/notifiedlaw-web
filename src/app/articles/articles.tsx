"use client";

import Link from "next/link";
import { useState } from "react";
import { Chevron, Chip, Empty, Page, SearchField, Title, cardCls } from "@/components/ui";
import { PreferredSource } from "@/components/preferred-source";

export type ArticleRow = { slug: string; title: string; summary: string; industry: string; mins: number; date: string | null };
const fmt = (iso: string | null) => (iso ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" }).format(new Date(iso)) : "");

export function Articles({ list }: { list: ArticleRow[] }) {
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("All");
  const industries = [...new Set(list.map((a) => a.industry).filter(Boolean))];
  const needle = q.toLowerCase();
  const shown = list.filter((a) => (industry === "All" || a.industry === industry) && (a.title + a.summary).toLowerCase().includes(needle));

  return (
    <Page>
      <Title title="Articles" sub="Short explainers on Ghanaian law" right={<PreferredSource />} />
      {list.length === 0 ? (
        <Empty title="No articles yet">Articles appear here once they are published.</Empty>
      ) : (
        <>
          <SearchField value={q} onChange={setQ} placeholder="Search articles" />
          {industries.length > 0 && (
            <div className="scroll-row flex flex-wrap gap-2">
              {["All", ...industries].map((i) => <Chip key={i} on={industry === i} onClick={() => setIndustry(i)}>{i === "All" ? "All industries" : i}</Chip>)}
            </div>
          )}
          <div className={`${cardCls} overflow-hidden`}>
            {shown.map((a) => (
              <Link key={a.slug} href={`/articles/${a.slug}`} className="flex items-center gap-3 border-t border-edge/[0.06] px-4 py-3.5 first:border-0 hover:bg-hover" style={{ textDecoration: "none", color: "inherit" }}>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{a.title}</span>
                  {a.summary && <span className="text-[13px] text-muted">{a.summary}</span>}
                  <span className="text-xs text-faint">{[a.industry, fmt(a.date), `${a.mins} min read`].filter(Boolean).join(" · ")}</span>
                </span>
                <Chevron />
              </Link>
            ))}
            {shown.length === 0 && <div role="status" className="p-6 text-center text-sm text-muted">No articles match “{q}”.</div>}
          </div>
        </>
      )}
    </Page>
  );
}
