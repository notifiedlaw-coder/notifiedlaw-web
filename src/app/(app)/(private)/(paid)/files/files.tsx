"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { usePlan } from "@/components/plan";
import { Btn, Chip, Page, SearchField, Title, cardCls } from "@/components/ui";
import { MAX_FILE_BYTES } from "@/lib/data";
import type { FilesState, Folder, StoredFile } from "@/lib/files";

const ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const FILTERS = ["All", "PDF", "DOCX"] as const;
const OFFLINE = "Could not reach NotifiedLaw. Check your connection and try again.";
// A plain anchor, not Btn's Link: downloads must be ordinary requests, never client navigations or prefetches.
const plainLink = "inline-flex h-8 items-center justify-center rounded-[7px] bg-surface px-3.5 text-[13px] font-medium text-ink no-underline shadow-[0_0_0_0.5px_var(--hairline)] hover:bg-fill";
const field = "h-8 min-w-0 rounded-[7px] bg-surface px-2.5 text-[13px] text-ink shadow-[0_0_0_0.5px_var(--hairline)] outline-none focus-visible:ring-2 focus-visible:ring-blue";

function size(n: number) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  const [v, unit] = n < 1024 ** 3 ? [n / 1024 / 1024, "MB"] : [n / 1024 ** 3, "GB"];
  return `${v.toFixed(v < 10 ? 1 : 0).replace(/\.0$/, "")} ${unit}`;
}
const date = (ms: number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" }).format(new Date(ms));

/** JSON request to the files API; the parsed body, or an error message. */
async function call<T>(url: string, method: string, body?: unknown): Promise<T | { error: string }> {
  const res = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
  const json = (await res?.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res?.ok || !json) return { error: json?.error ?? OFFLINE };
  return json;
}
const failed = (r: unknown): r is { error: string } => !!r && typeof r === "object" && "error" in r;

/** Folder ids from the top level down to `id`. */
function pathTo(folders: Folder[], id: string | null) {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const out: Folder[] = [];
  for (let at = id ? byId.get(id) : undefined; at && out.length < 20; at = at.parentId ? byId.get(at.parentId) : undefined) out.unshift(at);
  return out;
}
/** The folder and everything inside it. */
function inside(folders: Folder[], id: string) {
  const out = new Set([id]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const f of folders) if (f.parentId && out.has(f.parentId) && !out.has(f.id)) { out.add(f.id); grew = true; }
  }
  return out;
}

type Item = { type: "folder"; f: Folder } | { type: "file"; f: StoredFile };

/** My Files: upload PDFs and Word documents into folders, then open, download, rename, move or delete them. Private to their owner. */
export function Files({ initial }: { initial: FilesState }) {
  const { max } = usePlan();
  const [{ files, folders, used, quota }, setState] = useState(initial);
  const [cwd, setCwd] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null); // row whose actions are showing
  const [confirm, setConfirm] = useState<string | null>(null);
  const [rename, setRename] = useState<{ id: string; value: string } | null>(null);
  const [newFolder, setNewFolder] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const crumbs = pathTo(folders, cwd);
  const label = (id: string | null) => ["My Files", ...pathTo(folders, id).map((f) => f.name)].join(" / ");
  const close = () => { setOpen(null); setConfirm(null); setRename(null); };

  const upload = async (list: FileList | File[]) => {
    const errs: string[] = [];
    let room = quota - used;
    for (const f of Array.from(list)) {
      // Quick checks here save a wasted upload; the server repeats them and inspects the contents.
      if (!/\.(pdf|docx)$/i.test(f.name)) { errs.push(`${f.name}: only PDF and Word (.docx) files can be uploaded.`); continue; }
      if (f.size > MAX_FILE_BYTES) { errs.push(`${f.name}: files can be up to ${size(MAX_FILE_BYTES)}.`); continue; }
      if (f.size > room) { errs.push(`${f.name}: not enough storage left.`); continue; }
      setBusy(f.name);
      const headers: Record<string, string> = { "x-file-name": encodeURIComponent(f.name) };
      if (cwd) headers["x-folder-id"] = cwd;
      const res = await fetch("/api/files", { method: "POST", headers, body: f }).catch(() => null);
      const body = (await res?.json().catch(() => null)) as (StoredFile & { error?: string }) | null;
      if (!res?.ok || !body?.id) { errs.push(`${f.name}: ${body?.error ?? OFFLINE}`); continue; }
      room -= body.size;
      setState((s) => ({ ...s, files: [body, ...s.files], used: s.used + body.size }));
    }
    setBusy(null);
    setErrors(errs);
    if (input.current) input.current.value = "";
  };

  const createFolder = async () => {
    const name = newFolder?.trim();
    if (!name) { setNewFolder(null); return; }
    const r = await call<Folder>("/api/folders", "POST", { name, parentId: cwd });
    if (failed(r)) { setErrors([r.error]); return; }
    setState((s) => ({ ...s, folders: [...s.folders, r] }));
    setNewFolder(null);
    setErrors([]);
  };

  const remove = async (it: Item) => {
    close();
    if (it.type === "file") {
      const r = await call(`/api/files/${it.f.id}`, "DELETE");
      if (failed(r)) { setErrors([`${it.f.name}: ${r.error}`]); return; }
      setState((s) => ({ ...s, files: s.files.filter((x) => x.id !== it.f.id), used: s.used - it.f.size }));
    } else {
      const r = await call<{ folders: string[] }>(`/api/folders/${it.f.id}`, "DELETE");
      if (failed(r)) { setErrors([`${it.f.name}: ${r.error}`]); return; }
      const gone = new Set(r.folders);
      setState((s) => {
        const lost = s.files.filter((x) => x.folderId && gone.has(x.folderId));
        return { ...s, folders: s.folders.filter((x) => !gone.has(x.id)), files: s.files.filter((x) => !lost.includes(x)), used: s.used - lost.reduce((t, x) => t + x.size, 0) };
      });
    }
  };

  const patch = async (it: Item, change: { name?: string; parent?: string | null }) => {
    const url = it.type === "file" ? `/api/files/${it.f.id}` : `/api/folders/${it.f.id}`;
    const body: Record<string, unknown> = {};
    if (change.name !== undefined) body.name = change.name;
    if (change.parent !== undefined) body[it.type === "file" ? "folderId" : "parentId"] = change.parent;
    const r = await call<{ name?: string; folderId?: string | null; parentId?: string | null }>(url, "PATCH", body);
    if (failed(r)) { setErrors([`${it.f.name}: ${r.error}`]); return; }
    setState((s) => it.type === "file"
      ? { ...s, files: s.files.map((x) => (x.id === it.f.id ? { ...x, ...(r.name ? { name: r.name } : {}), ...(r.folderId !== undefined ? { folderId: r.folderId } : {}) } : x)) }
      : { ...s, folders: s.folders.map((x) => (x.id === it.f.id ? { ...x, ...(r.name ? { name: r.name } : {}), ...(r.parentId !== undefined ? { parentId: r.parentId } : {}) } : x)) });
    setErrors([]);
    close();
  };

  const needle = q.trim().toLowerCase();
  const kindOk = (f: StoredFile) => filter === "All" || f.kind === filter.toLowerCase();
  // A search looks through every folder; otherwise the current folder is shown, its subfolders first.
  const items: Item[] = needle
    ? [
        ...(filter === "All" ? folders.filter((f) => f.name.toLowerCase().includes(needle)).map((f) => ({ type: "folder" as const, f })) : []),
        ...files.filter((f) => kindOk(f) && f.name.toLowerCase().includes(needle)).map((f) => ({ type: "file" as const, f })),
      ]
    : [
        ...(filter === "All" ? folders.filter((f) => f.parentId === cwd).map((f) => ({ type: "folder" as const, f })) : []),
        ...files.filter((f) => f.folderId === cwd && kindOk(f)).map((f) => ({ type: "file" as const, f })),
      ];
  const pct = quota ? Math.min(100, (used / quota) * 100) : 100;
  const full = pct >= 90;

  return (
    <Page>
      <Title
        title="My Files"
        sub="Lecture notes, past papers and your own answers, in one place. Only you can see your files."
        right={
          <div className="flex gap-2">
            <Btn tone="plain" onClick={() => setNewFolder("")} disabled={newFolder !== null}>New folder</Btn>
            <Btn onClick={() => input.current?.click()} disabled={!!busy}>{busy ? "Uploading…" : "Upload PDF or Word"}</Btn>
          </div>
        }
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

      {busy && <div role="status" className="text-[13px] text-muted">Uploading and checking {busy}…</div>}
      {errors.length > 0 && (
        <div role="alert" className="rounded-xl bg-red/10 px-4 py-3 text-[13px] text-ink">
          {errors.map((e) => <div key={e}>{e}</div>)}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={q} onChange={setQ} placeholder="Search all your files" />
        {FILTERS.map((x) => <Chip key={x} on={filter === x} onClick={() => setFilter(x)}>{x}</Chip>)}
      </div>

      {!needle && (
        <nav aria-label="Folder" className="-mb-3 flex flex-wrap items-center gap-1 text-[13px]">
          {[{ id: null, name: "My Files" }, ...crumbs].map((c, i, all) => (
            <span key={c.id ?? "root"} className="flex items-center gap-1">
              {i > 0 && <span className="text-faint">/</span>}
              {i === all.length - 1
                ? <span className="font-semibold">{c.name}</span>
                : <button type="button" onClick={() => { setCwd(c.id); close(); }} className="text-link">{c.name}</button>}
            </span>
          ))}
        </nav>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (!busy && e.dataTransfer.files.length) void upload(e.dataTransfer.files); }}
        className={`${cardCls} ${over ? "ring-2 ring-blue" : ""}`}
      >
        {newFolder !== null && (
          <form onSubmit={(e) => { e.preventDefault(); void createFolder(); }} className="flex items-center gap-2 border-b border-[var(--hairline)] px-4 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber/15 text-amber"><Icon name="folder" size={16} /></span>
            <input autoFocus value={newFolder} onChange={(e) => setNewFolder(e.target.value)} maxLength={80} placeholder="Folder name" aria-label="Folder name" className={`${field} flex-1`} />
            <Btn type="submit">Create</Btn>
            <Btn tone="plain" onClick={() => setNewFolder(null)}>Cancel</Btn>
          </form>
        )}
        {items.length ? (
          <ul className="m-0 list-none divide-y divide-[var(--hairline)] p-0">
            {items.map((it) => {
              const { f } = it;
              const isOpen = open === f.id;
              const nested = it.type === "folder" ? inside(folders, f.id) : null;
              const count = nested ? files.filter((x) => x.folderId && nested.has(x.folderId)).length : 0;
              return (
                <li key={f.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {it.type === "folder" ? (
                      <button type="button" onClick={() => { setCwd(f.id); setQ(""); close(); }} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber/15 text-amber"><Icon name="folder" size={16} /></span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{f.name}</span>
                          <span className="block text-xs text-muted">{needle ? label(it.f.parentId) : `Folder · ${count} ${count === 1 ? "file" : "files"}`}</span>
                        </span>
                      </button>
                    ) : (
                      <>
                        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${it.f.kind === "pdf" ? "bg-red/10 text-red" : "bg-blue/10 text-link"}`}><Icon name="doc" size={16} /></span>
                        <div className="min-w-0 flex-1">
                          {it.f.kind === "pdf"
                            ? <a href={`/api/files/${f.id}?view=1`} target="_blank" rel="noopener" className="block truncate text-sm font-medium text-ink">{f.name}</a>
                            : <a href={`/api/files/${f.id}`} className="block truncate text-sm font-medium text-ink">{f.name}</a>}
                          <div className="truncate text-xs text-muted">{it.f.kind.toUpperCase()} · {size(it.f.size)} · {date(f.createdAt)}{needle ? ` · ${label(it.f.folderId)}` : ""}</div>
                        </div>
                        <a href={`/api/files/${f.id}`} download className={`${plainLink} max-sm:hidden`}>Download</a>
                      </>
                    )}
                    <button type="button" aria-expanded={isOpen} aria-label={`More actions for ${f.name}`} onClick={() => { close(); if (!isOpen) setOpen(f.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] text-lg leading-none text-muted hover:bg-fill">⋯</button>
                  </div>
                  {isOpen && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 pl-12">
                      {rename?.id === f.id ? (
                        <form onSubmit={(e) => { e.preventDefault(); void patch(it, { name: rename.value }); }} className="flex flex-1 gap-2">
                          <input autoFocus value={rename.value} onChange={(e) => setRename({ id: f.id, value: e.target.value })} maxLength={130} aria-label="New name" className={`${field} flex-1`} />
                          <Btn type="submit">Save</Btn>
                          <Btn tone="plain" onClick={() => setRename(null)}>Cancel</Btn>
                        </form>
                      ) : confirm === f.id ? (
                        <>
                          <span className="text-[13px]">{it.type === "folder" ? `Delete this folder${count ? ` and the ${count} ${count === 1 ? "file" : "files"} inside it` : ""}?` : "Delete this file?"}</span>
                          <Btn onClick={() => void remove(it)} className="!bg-red">Delete</Btn>
                          <Btn tone="plain" onClick={() => setConfirm(null)}>Keep</Btn>
                        </>
                      ) : (
                        <>
                          {it.type === "file" && <a href={`/api/files/${f.id}`} download className={`${plainLink} sm:hidden`}>Download</a>}
                          <Btn tone="plain" onClick={() => setRename({ id: f.id, value: it.type === "file" ? f.name.replace(/\.(pdf|docx)$/i, "") : f.name })}>Rename</Btn>
                          <label className="flex items-center gap-1.5 text-[13px] text-muted">
                            Move to
                            <select
                              value={(it.type === "file" ? it.f.folderId : it.f.parentId) ?? ""}
                              onChange={(e) => void patch(it, { parent: e.target.value || null })}
                              className={field}
                            >
                              <option value="">My Files</option>
                              {folders.filter((x) => !nested?.has(x.id)).map((x) => <option key={x.id} value={x.id}>{label(x.id).replace(/^My Files \/ /, "")}</option>)}
                            </select>
                          </label>
                          <Btn tone="plain" onClick={() => setConfirm(f.id)}>Delete</Btn>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : newFolder === null && (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-blue/10 text-link"><Icon name="folder" size={20} /></span>
            <div className="text-[15px] font-semibold">{needle ? "No matching files" : cwd ? "This folder is empty" : files.length ? "No files here" : "No files yet"}</div>
            <div className="max-w-[420px] text-[13px] text-muted">
              {needle ? "Try a different search or filter." : `Upload PDFs and Word documents, up to ${size(MAX_FILE_BYTES)} each, or drop them here.`}
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
