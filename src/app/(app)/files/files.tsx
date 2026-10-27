"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Btn, Chip, Page, SearchField, Title } from "@/components/ui";
import { FILES } from "@/lib/content";

const TAG: Record<string, string> = { pdf: "#FF3B30", docx: "#007AFF" };

export function Files() {
  const [q, setQ] = useState("");
  const [f, setF] = useState("All");
  const rows = FILES.filter((x) => (f === "All" || (f === "Folders" ? x.type === "folder" : x.type === f.toLowerCase())) && x.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Page>
      <Title title="My Files" sub="Lecture notes, past papers and your own answers. Use any file as a source in Notified AI."
        right={<div className="flex gap-2"><Btn tone="plain">New folder</Btn><Btn>Upload PDF or Word</Btn></div>} />
      <div className="rounded-xl bg-surface px-4 py-3 shadow-card">
        <div className="flex justify-between text-xs"><span className="font-semibold">Storage</span><span className="text-muted">68 MB of 500 MB</span></div>
        <div className="mt-2 h-1 rounded-sm bg-track"><div className="h-full w-[14%] rounded-sm bg-blue" /></div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={q} onChange={setQ} placeholder="Search your files" />
        {["All", "Folders", "PDF", "DOCX"].map((x) => <Chip key={x} on={f === x} onClick={() => setF(x)}>{x}</Chip>)}
      </div>
      <div className="overflow-hidden rounded-xl bg-surface shadow-card">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-3 border-t border-edge/[0.06] px-4 py-3 first:border-0 hover:bg-hover">
            {r.type === "folder" ? <span className="flex size-9 items-center justify-center rounded-lg bg-blue/10 text-blue"><Icon name="folder" size={18} /></span>
              : <span className="flex size-9 items-center justify-center rounded-lg text-[10px] font-bold text-white" style={{ background: TAG[r.type] }}>{r.type.toUpperCase()}</span>}
            <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-sm font-medium">{r.name}</span><span className="text-xs text-muted">{r.meta}</span></span>
            {r.type !== "folder" && <Link href="/ai" className="hidden items-center gap-1 rounded-md bg-indigo/10 px-2 py-1 text-xs font-medium text-indigo sm:flex" style={{ textDecoration: "none" }}><Icon name="sparkle" size={12} />Review with AI</Link>}
          </div>
        ))}
        {rows.length === 0 && <div className="p-6 text-center text-sm text-muted">No files match.</div>}
      </div>
    </Page>
  );
}
