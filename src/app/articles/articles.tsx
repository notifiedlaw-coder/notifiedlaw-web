"use client";

import Link from "next/link";
import { useState } from "react";
import { Chip, Empty, Page, SearchField, Title, cardCls } from "@/components/ui";
import { PreferredSource } from "@/components/preferred-source";

export type ArticleRow = { slug: string; title: string; summary: string; industry: string; mins: number; date: string | null; image: string };
const meta = (a: ArticleRow) => [fmt(a.date), `${a.mins} min read`].filter(Boolean).join(" · ");
/** The cover photo, or a soft gradient with the title's initial when an article has none. */
function Cover({ a, eager }: { a: ArticleRow; eager?: boolean }) {
  return a.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={a.image} alt="" width={1280} height={720} loading={eager ? "eager" : "lazy"} decoding="async" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
  ) : (
    <span aria-hidden className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#ff9f0a]/25 via-[#af52de]/15 to-[#007aff]/25 text-5xl font-bold text-muted/50">{a.title[0]}</span>
  );
}
const fmt = (iso: string | null) => (iso ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" }).format(new Date(iso)) : "");

export function Articles({ list }: { list: ArticleRow[] }) {
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("All");
  const industries = [...new Set(list.map((a) => a.industry).filter(Boolean))];
  const needle = q.toLowerCase();
  const shown = list.filter((a) => (industry === "All" || a.industry === industry) && (a.title + a.summary).toLowerCase().includes(needle));

  const featured = industry === "All" && !needle;
  const lead = featured ? shown[0] : undefined;
  const rest = featured ? shown.slice(1) : shown;

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
          {shown.length === 0 ? (
            <div role="status" className="rounded-2xl bg-surface p-6 text-center text-sm text-muted shadow-card">No articles match “{q}”.</div>
          ) : (
            <>
              {lead && (
                <Link href={`/articles/${lead.slug}`} className={`${cardCls} group block overflow-hidden rounded-[26px] transition-transform duration-300 active:scale-[0.985] sm:grid sm:grid-cols-[1.35fr_1fr]`} style={{ textDecoration: "none", color: "inherit" }}>
                  <span className="relative block aspect-video overflow-hidden sm:aspect-auto sm:min-h-[300px]"><Cover a={lead} eager /></span>
                  <span className="flex flex-col gap-2 p-5 sm:justify-center sm:p-8">
                    <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#ff9f0a]">Featured{lead.industry ? ` · ${lead.industry}` : ""}</span>
                    <span className="text-balance text-[24px] font-bold leading-[1.15] tracking-[-0.022em] sm:text-[28px]">{lead.title}</span>
                    {lead.summary && <span className="line-clamp-3 text-[15px] leading-snug text-muted">{lead.summary}</span>}
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
                    <Link key={a.slug} href={`/articles/${a.slug}`} className={`${cardCls} group flex flex-col overflow-hidden rounded-[22px] transition-transform duration-300 active:scale-[0.98]`} style={{ textDecoration: "none", color: "inherit" }}>
                      <span className="relative block aspect-video overflow-hidden"><Cover a={a} /></span>
                      <span className="flex flex-1 flex-col gap-1.5 p-4">
                        {a.industry && <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#ff9f0a]">{a.industry}</span>}
                        <span className="text-balance text-[18px] font-semibold leading-snug tracking-[-0.01em]">{a.title}</span>
                        {a.summary && <span className="line-clamp-2 text-[14px] leading-snug text-muted">{a.summary}</span>}
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
