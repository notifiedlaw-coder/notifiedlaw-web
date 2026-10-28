"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { usePlan } from "@/components/plan";
import { Btn, Chip, Page, SearchField, Title, cardCls } from "@/components/ui";
import { MAX_FILE_BYTES } from "@/lib/data";
import type { FilesState, StoredFile } from "@/lib/files";

const ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
// A plain anchor, not Btn's Link: downloads must be ordinary requests, never client navigations or prefetches.
const plainLink = "inline-flex h-8 items-center justify-center rounded-[7px] bg-surface px-3.5 text-[13px] font-medium text-ink no-underline shadow-[0_0_0_0.5px_var(--hairline)] hover:bg-fill";
const FILTERS = ["All", "PDF", "DOCX"] as const;

function size(n: number) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  const [v, unit] = n < 1024 ** 3 ? [n / 1024 / 1024, "MB"] : [n / 1024 ** 3, "GB"];
  return `${v.toFixed(v < 10 ? 1 : 0).replace(/\.0$/, "")} ${unit}`;
}
const date = (ms: number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" }).format(new Date(ms));

/** My Files: upload PDFs and Word documents, then open, download or delete them. Files are private to their owner. */
export function Files({ initial }: { initial: FilesState }) {
  const { max } = usePlan();
  const [{ files, used, quota }, setState] = useState(initial);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const upload = async (list: FileList | File[]) => {
    const errs: string[] = [];
    let room = quota - used;
    for (const f of Array.from(list)) {
      // Quick checks here save a wasted upload; the server repeats them and inspects the contents.
      if (!/\.(pdf|docx)$/i.test(f.name)) { errs.push(`${f.name}: only PDF and Word (.docx) files can be uploaded.`); continue; }
      if (f.size > MAX_FILE_BYTES) { errs.push(`${f.name}: files can be up to ${size(MAX_FILE_BYTES)}.`); continue; }
      if (f.size > room) { errs.push(`${f.name}: not enough storage left.`); continue; }
      setBusy(f.name);
      const res = await fetch("/api/files", { method: "POST", headers: { "x-file-name": encodeURIComponent(f.name) }, body: f }).catch(() => null);
      const body = (await res?.json().catch(() => null)) as (StoredFile & { error?: string }) | null;
      if (!res?.ok || !body?.id) { errs.push(`${f.name}: ${body?.error ?? "Could not reach NotifiedLaw. Check your connection and try again."}`); continue; }
      room -= body.size;
      setState((s) => ({ ...s, files: [body, ...s.files], used: s.used + body.size }));
    }
    setBusy(null);
    setErrors(errs);
    if (input.current) input.current.value = "";
  };

  const remove = async (f: StoredFile) => {
    setConfirm(null);
    const res = await fetch(`/api/files/${f.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) { setErrors([`${f.name}: could not be deleted. Try again.`]); return; }
    setState((s) => ({ ...s, files: s.files.filter((x) => x.id !== f.id), used: s.used - f.size }));
  };

  const shown = files.filter((f) => (filter === "All" || f.kind === filter.toLowerCase()) && f.name.toLowerCase().includes(q.trim().toLowerCase()));
  const pct = Math.min(100, (used / quota) * 100);
  const full = pct >= 90;

  return (
    <Page>
      <Title
        title="My Files"
        sub="Lecture notes, past papers and your own answers, in one place. Only you can see your files."
        right={<Btn onClick={() => input.current?.click()} disabled={!!busy}>{busy ? "Uploading…" : "Upload PDF or Word"}</Btn>}
      />
      <input ref={input} type="file" accept={ACCEPT} multiple hidden onChange={(e) => e.target.files && void upload(e.target.files)} />

      <div className="rounded-xl bg-surface px-4 py-3 shadow-card">
        <div className="flex justify-between text-xs">
          <span className="font-semibold">Storage</span>
          <span className="text-muted">{used ? size(used) : "0 MB"} of {size(quota)}</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-sm bg-track">
          <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: full ? "var(--color-red)" : "var(--color-blue)" }} />
        </div>
        {full && !max && <div className="mt-2 text-xs text-muted">Running out of space? <Link href="/plans">Upgrade for more storage.</Link></div>}
      </div>

      {busy && <div role="status" className="text-[13px] text-muted">Uploading {busy}…</div>}
      {errors.length > 0 && (
        <div role="alert" className="rounded-xl bg-red/10 px-4 py-3 text-[13px] text-ink">
          {errors.map((e) => <div key={e}>{e}</div>)}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={q} onChange={setQ} placeholder="Search your files" />
        {FILTERS.map((x) => <Chip key={x} on={filter === x} onClick={() => setFilter(x)}>{x}</Chip>)}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (!busy && e.dataTransfer.files.length) void upload(e.dataTransfer.files); }}
        className={`${cardCls} ${over ? "ring-2 ring-blue" : ""}`}
      >
        {shown.length ? (
          <ul className="m-0 list-none divide-y divide-[var(--hairline)] p-0">
            {shown.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${f.kind === "pdf" ? "bg-red/10 text-red" : "bg-blue/10 text-link"}`}><Icon name="doc" size={16} /></span>
                <div className="min-w-0 flex-1">
                  {f.kind === "pdf"
                    ? <a href={`/api/files/${f.id}?view=1`} target="_blank" rel="noopener" className="block truncate text-sm font-medium text-ink">{f.name}</a>
                    : <a href={`/api/files/${f.id}`} className="block truncate text-sm font-medium text-ink">{f.name}</a>}
                  <div className="text-xs text-muted">{f.kind.toUpperCase()} · {size(f.size)} · {date(f.createdAt)}</div>
                </div>
                {confirm === f.id ? (
                  <div className="flex gap-1.5">
                    <Btn tone="plain" onClick={() => setConfirm(null)}>Keep</Btn>
                    <Btn onClick={() => void remove(f)} className="!bg-red">Delete</Btn>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <a href={`/api/files/${f.id}`} download className={plainLink}>Download</a>
                    <Btn tone="plain" onClick={() => setConfirm(f.id)}>Delete</Btn>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-blue/10 text-link"><Icon name="folder" size={20} /></span>
            <div className="text-[15px] font-semibold">{files.length ? "No matching files" : "No files yet"}</div>
            <div className="max-w-[420px] text-[13px] text-muted">
              {files.length ? "Try a different search or filter." : `Upload PDFs and Word documents, up to ${size(MAX_FILE_BYTES)} each, or drop them here.`}
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
