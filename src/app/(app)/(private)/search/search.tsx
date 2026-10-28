"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Badge, Chip, Segmented } from "@/components/ui";
import { ARTICLES, INDUSTRIES } from "@/lib/content";

const PASSAGES = [
  { source: "Edusei v Attorney-General · ¶4", kind: "good" as const, pre: "The enforcement of the fundamental human rights of the individual is a matter for the High Court under ", hl: "Article 33(1)", post: ", and this court will not assume that jurisdiction merely because Article 2 is cited on the writ.", meta: "Supreme Court · [1996–97] SCGLR 1", href: "/case-law/edusei-v-attorney-general" },
  { source: "Edusei v Attorney-General · ¶5", kind: "good" as const, pre: "", hl: "Article 140(2)", post: " confirms that the High Court has jurisdiction to enforce the fundamental human rights and freedoms guaranteed by the Constitution.", meta: "Supreme Court · [1996–97] SCGLR 1", href: "/case-law/edusei-v-attorney-general" },
];

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-2"><div className="px-1 text-[13px] font-semibold text-muted">{title}</div>{children}</section>
);
const row = "flex flex-col gap-0.5 rounded-xl bg-surface px-4 py-3 shadow-card hover:shadow-card-hover";

export function Search() {
  const [q, setQ] = useState("Article 33");
  const [mode, setMode] = useState<"Titles" | "Passages">("Titles");
  const [industry, setIndustry] = useState("All");
  const [trending, setTrending] = useState(false);
  const needle = q.toLowerCase();
  const articles = ARTICLES.filter((a) => (industry === "All" || a.industry === industry) && (a.title + a.summary + a.area).toLowerCase().includes(needle))
    .sort((a, b) => (trending ? b.views - a.views : 0));
  const onlyArticles = industry !== "All";
  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-5 px-5 pb-12 pt-8">
      <div className="flex h-11 items-center gap-2.5 rounded-xl bg-surface px-4 shadow-[0_0_0_0.5px_var(--hairline)]">
        <Icon name="search" size={16} className="text-faint" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cases, articles, topics" aria-label="Search cases, articles, topics" className="flex-1 bg-transparent text-[15px] outline-none" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented options={["Titles", "Passages"] as const} value={mode} onChange={setMode} labels={{ Titles: "Titles & topics", Passages: "Inside judgments" }} />
        <span className="text-xs text-muted">{mode === "Titles" ? "Matches names, articles and topics." : "Finds the exact passage in a judgment."}</span>
      </div>
      {mode === "Titles" && (
        <div className="scroll-row flex flex-wrap items-center gap-2">
          <Chip on={trending} onClick={() => setTrending((t) => !t)}>Trending</Chip>
          <span className="mx-1 h-4 w-px bg-edge/10" />
          <span className="text-xs text-muted">Industry</span>
          {["All", ...INDUSTRIES].map((i) => <Chip key={i} on={industry === i} onClick={() => setIndustry(i)}>{i}</Chip>)}
        </div>
      )}
      {mode === "Passages" ? (
        <div className="flex flex-col gap-2.5">
          {PASSAGES.map((p) => (
            <Link key={p.source} href={p.href} className={row} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="flex items-center gap-2"><span className="flex-1 text-[13px] font-semibold">{p.source}</span><Badge kind={p.kind} /></div>
              <p className="text-sm leading-normal">{p.pre}<mark className="rounded-[3px] bg-[rgba(255,204,0,0.35)]">{p.hl}</mark>{p.post}</p>
              <span className="text-xs text-muted">{p.meta}</span>
            </Link>
          ))}
        </div>
      ) : (
        <>
          {articles.length > 0 && (
            <Group title={trending ? "Articles · Trending" : "Articles"}>
              {articles.map((a) => (
                <Link key={a.slug} href={`/articles/${a.slug}`} className={row} style={{ textDecoration: "none", color: "inherit" }}>
                  <span className="text-sm font-semibold">{a.title}</span>
                  <span className="text-[13px] leading-normal text-muted">{a.summary}</span>
                  <span className="text-xs text-faint">{a.industry} · {a.mins} min read{trending ? ` · ${a.views.toLocaleString()} reads` : ""}</span>
                </Link>
              ))}
            </Group>
          )}
          {onlyArticles && articles.length === 0 && <div className="p-6 text-center text-sm text-muted">No {industry} articles match “{q}”.</div>}
          {!onlyArticles && <>
          <Group title="Constitution & statutes">
            <Link href="/legislation" className={row} style={{ textDecoration: "none", color: "inherit" }}>
              <span className="text-sm font-semibold">Article 33(1) · Protection of rights by the courts</span>
              <span className="text-[13px] leading-normal text-muted">A person who alleges that a fundamental human right has been, is being or is likely to be contravened in relation to them may apply to the High Court for redress.</span>
              <span className="text-xs text-faint">1992 Constitution · Chapter 5</span>
            </Link>
          </Group>
          <Group title="Topics">
            {[["Enforcement under Article 33", "Constitutional Law II · Topic 3 · Level 200", "/library/law-201/3"], ["Judicial Review & the Supremacy of the Constitution", "Constitutional Law II · Topic 1 · Section 4 mentions Article 33", "/library/law-201/1"], ["Administrative Justice (Art. 23)", "Administrative Law · Topic 3 · Level 300", "/library/law-305/3"]].map(([t, s, h]) => (
              <Link key={t} href={h} className={row} style={{ textDecoration: "none", color: "inherit" }}><span className="text-sm font-semibold">{t}</span><span className="text-xs text-muted">{s}</span></Link>
            ))}
          </Group>
          <Group title="Cases">
            <Link href="/case-law/edusei-v-attorney-general" className={row} style={{ textDecoration: "none", color: "inherit" }}><span className="text-sm font-semibold">Edusei v Attorney-General</span><span className="text-xs text-muted">Supreme Court · Human-rights claims belong in the High Court</span></Link>
            <div className={row}><span className="text-sm font-semibold">Tuffuor v Attorney-General</span><span className="text-xs text-muted">[1980] GLR 637 · Constitutional supremacy</span></div>
          </Group>
          </>}
        </>
      )}
      <Link href="/ai" className="flex items-center gap-2.5 rounded-xl bg-indigo/10 px-4 py-3 text-sm" style={{ textDecoration: "none", color: "inherit" }}>
        <Icon name="sparkle" size={16} className="text-indigo" />
        <span className="flex-1">Ask Notified AI: <b>“{q}”</b></span>
      </Link>
    </div>
  );
}
