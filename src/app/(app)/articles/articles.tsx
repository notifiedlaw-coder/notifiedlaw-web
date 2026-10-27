"use client";

import Link from "next/link";
import { useState } from "react";
import { Chevron, Chip, Page, SearchField, Title, cardCls } from "@/components/ui";
import { ARTICLES, INDUSTRIES } from "@/lib/content";

export function Articles() {
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("All");
  const [trending, setTrending] = useState(false);
  const needle = q.toLowerCase();
  const list = ARTICLES.filter((a) => (industry === "All" || a.industry === industry) && (a.title + a.summary).toLowerCase().includes(needle))
    .sort((a, b) => (trending ? b.views - a.views : 0));

  return (
    <Page>
      <Title title="Articles" sub="Short explainers on Ghanaian law, linked to cases, statutes and topics" />
      <SearchField value={q} onChange={setQ} placeholder="Search articles" />
      <div className="flex flex-wrap gap-2">
        <Chip on={trending} onClick={() => setTrending((t) => !t)}>Trending</Chip>
        <span className="mx-1 h-4 w-px bg-edge/10 self-center" />
        {["All", ...INDUSTRIES].map((i) => <Chip key={i} on={industry === i} onClick={() => setIndustry(i)}>{i === "All" ? "All industries" : i}</Chip>)}
      </div>
      <div className={`${cardCls} overflow-hidden`}>
        {list.map((a) => (
          <Link key={a.slug} href={`/articles/${a.slug}`} className="flex items-center gap-3 border-t border-edge/[0.06] px-4 py-3.5 first:border-0 hover:bg-hover" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-semibold">{a.title}</span>
              <span className="text-[13px] text-muted">{a.summary}</span>
              <span className="text-xs text-faint">{a.industry} · {a.date} · {a.mins} min read{trending ? ` · ${a.views.toLocaleString()} reads` : ""}</span>
            </span>
            <Chevron />
          </Link>
        ))}
        {list.length === 0 && <div className="p-6 text-center text-sm text-muted">No articles match “{q}”.</div>}
      </div>
    </Page>
  );
}
