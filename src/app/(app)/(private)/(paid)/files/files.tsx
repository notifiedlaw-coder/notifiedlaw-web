"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { usePlan } from "@/components/plan";
import { Btn, Chip, Page, SearchField } from "@/components/ui";
import { MAX_FILE_BYTES } from "@/lib/data";
import type { FilesState, Folder, StoredFile } from "@/lib/files";

const ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const FILTERS = ["All", "PDF", "DOCX"] as const;
// A plain anchor, not Btn's Link: downloads must be ordinary requests, never client navigations or prefetches.
const plainLink = "inline-flex h-10 items-center justify-center rounded-full border border-edge/15 bg-surface px-4 text-[15px] font-medium text-ink! no-underline hover:bg-hover";
const field = "h-10 min-w-0 rounded-[12px] border border-edge/15 bg-surface px-3 text-[15px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-blue";
/** A folder's colour tab, picked from the design palette by its name so it stays the same. */
const TABS = ["#23305C", "#C4552B", "#8A2B4F", "#2F7A4F", "#6B4A8A", "#2F6B6B"];
const tab = (name: string) => TABS[[...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % TABS.length];

function size(n: number) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  const [v, unit] = n < 1024 ** 3 ? [n / 1024 / 1024, "MB"] : [n / 1024 ** 3, "GB"];
  return `${v.toFixed(v < 10 ? 1 : 0).replace(/\.0$/, "")} ${unit}`;
}
const date = (ms: number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" }).format(new Date(ms));

type Failure = { failed: string }; // an error code, src/lib/error-codes.ts
/** All the user is told about a failure: never the reason, only a code support can look up. */
const errorText = (code: string) => `An error has occurred please try again later. Error code: ${code}`;
/** The API's error code, or H<status> when the response carried none (the shared rate limiter's 429). */
const codeOf = (status: number, body: unknown) =>
  body && typeof body === "object" && "code" in body && typeof body.code === "string" ? body.code : `H${status}`;

/** JSON request to the files API; the parsed body, or an error code. */
async function call<T>(url: string, method: string, body?: unknown): Promise<T | Failure> {
  const res = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
  if (!res) return { failed: "N001" };
  const json = (await res.json().catch(() => null)) as T | null;
  if (!res.ok || !json) return { failed: codeOf(res.status, json) };
  return json;
}
const failed = (r: unknown): r is Failure => !!r && typeof r === "object" && "failed" in r;

/** Uploads one file, reporting the share of its bytes sent so far (0 to 1). XHR, since fetch cannot report upload progress. */
function send(f: File, folderId: string | null, onSent: (share: number) => void) {
  return new Promise<StoredFile | Failure>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/files");
    xhr.setRequestHeader("x-file-name", encodeURIComponent(f.name));
    if (folderId) xhr.setRequestHeader("x-folder-id", folderId);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onSent(e.loaded / e.total); };
    xhr.onload = () => {
      let body: (StoredFile & { code?: string }) | null = null;
      try { body = JSON.parse(xhr.responseText); } catch { /* no body: coded from the status */ }
      resolve(xhr.status >= 200 && xhr.status < 300 && body?.id ? body : { failed: codeOf(xhr.status, body) });
    };
    xhr.onerror = xhr.onabort = xhr.ontimeout = () => resolve({ failed: "N001" });
    xhr.send(f);
  });
}

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
  // The upload under way: which file, its place in the batch, and the share of its bytes sent (1: being checked).
  const [busy, setBusy] = useState<{ name: string; n: number; of: number; sent: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null); // row whose actions are showing
  const [confirm, setConfirm] = useState<string | null>(null);
  const [rename, setRename] = useState<{ id: string; value: string } | null>(null);
  const [newFolder, setNewFolder] = useState<string | null>(null);
  const creating = useRef(false); // Enter and a click on Create together submit twice; only the first is sent
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const crumbs = pathTo(folders, cwd);
  // Folder names are unique in each place, ignoring case (the server enforces it too).
  const taken = (name: string, parent: string | null, except?: string) =>
    folders.some((f) => f.id !== except && f.parentId === parent && f.name.toLowerCase() === name.trim().toLowerCase());
  const label = (id: string | null) => ["My Files", ...pathTo(folders, id).map((f) => f.name)].join(" / ");
  const close = () => { setOpen(null); setConfirm(null); setRename(null); };

  const upload = async (list: FileList | File[]) => {
    const errs: string[] = [];
    const all = Array.from(list);
    let room = quota - used;
    for (const [i, f] of all.entries()) {
      // Quick checks here save a wasted upload; the server repeats them and inspects the contents.
      if (!/\.(pdf|docx)$/i.test(f.name)) { errs.push(`${f.name}: ${errorText("N002")}`); continue; }
      if (f.size > MAX_FILE_BYTES) { errs.push(`${f.name}: ${errorText("N003")}`); continue; }
      if (f.size > room) { errs.push(`${f.name}: ${errorText("N004")}`); continue; }
      const at = { name: f.name, n: i + 1, of: all.length };
      setBusy({ ...at, sent: 0 });
      const body = await send(f, cwd, (sent) => setBusy({ ...at, sent }));
      if (failed(body)) { errs.push(`${f.name}: ${errorText(body.failed)}`); continue; }
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
    if (creating.current || taken(name, cwd)) return;
    creating.current = true;
    const r = await call<Folder>("/api/folders", "POST", { name, parentId: cwd });
    creating.current = false;
    if (failed(r)) { setErrors([errorText(r.failed)]); return; }
    setState((s) => ({ ...s, folders: [...s.folders, r] }));
    setNewFolder(null);
    setErrors([]);
  };

  const remove = async (it: Item) => {
    close();
    if (it.type === "file") {
      const r = await call(`/api/files/${it.f.id}`, "DELETE");
      if (failed(r)) { setErrors([`${it.f.name}: ${errorText(r.failed)}`]); return; }
      setState((s) => ({ ...s, files: s.files.filter((x) => x.id !== it.f.id), used: s.used - it.f.size }));
    } else {
      const r = await call<{ folders: string[] }>(`/api/folders/${it.f.id}`, "DELETE");
      if (failed(r)) { setErrors([`${it.f.name}: ${errorText(r.failed)}`]); return; }
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
    if (failed(r)) { setErrors([`${it.f.name}: ${errorText(r.failed)}`]); return; }
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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">Only you can see these</div>
          <h1 className="m-0 text-[38px] leading-[1.02] md:text-[46px] lg:text-[56px]">My files</h1>
        </div>
        {/* Hick's law: Upload is the one primary action; a new folder is secondary. */}
        <div className="flex w-full gap-2 sm:w-auto">
          <Btn tone="plain" onClick={() => setNewFolder("")} disabled={newFolder !== null} className="flex-1 sm:flex-none">New folder</Btn>
          <Btn onClick={() => input.current?.click()} disabled={!!busy} className="flex-1 sm:flex-none">{busy ? `Uploading… ${Math.round(busy.sent * 100)}%` : <><span className="sm:hidden">Upload</span><span className="hidden sm:inline">Upload PDF or Word</span></>}</Btn>
        </div>
      </header>
      <input ref={input} type="file" accept={ACCEPT} multiple hidden onChange={(e) => e.target.files && void upload(e.target.files)} />

      <div className="rounded-[18px] border border-edge/10 bg-surface px-5 py-4">
        <div className="flex justify-between text-[14px]">
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">Storage</span>
          <span className="text-muted">{used ? size(used) : "0 MB"} of {size(quota)}</span>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-fill">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: full ? "var(--color-plum)" : "var(--primary)" }} />
        </div>
        {full && !max && <div className="mt-2 text-[14px] text-muted">Running out of space? <Link href="/plans">Upgrade for more storage.</Link></div>}
      </div>

      {busy && (
        <div role="status" className="rounded-[18px] border border-edge/10 bg-surface px-5 py-4">
          <div className="flex justify-between gap-3 text-[14px]">
            <span className="truncate font-semibold">{busy.sent < 1 ? "Uploading" : "Checking"} {busy.name}</span>
            <span className="shrink-0 text-muted">{busy.of > 1 ? `File ${busy.n} of ${busy.of} · ` : ""}{busy.sent < 1 ? `${Math.round(busy.sent * 100)}%` : "Scanning…"}</span>
          </div>
          <div role="progressbar" aria-label={`Uploading ${busy.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(busy.sent * 100)} className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-fill">
            <div className={`h-full rounded-full bg-blue transition-[width] duration-200 ${busy.sent >= 1 ? "animate-pulse" : ""}`} style={{ width: `${busy.sent * 100}%` }} />
          </div>
        </div>
      )}
      {errors.length > 0 && (
        <div role="alert" className="rounded-[18px] bg-plum-bg px-5 py-3.5 text-[14px] text-plum-fg">
          {errors.map((e) => <div key={e}>{e}</div>)}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex w-full sm:w-auto sm:flex-1"><SearchField value={q} onChange={setQ} placeholder="Search all your files" /></div>
        {FILTERS.map((x) => <Chip key={x} on={filter === x} onClick={() => setFilter(x)}>{x}</Chip>)}
      </div>

      {!needle && (
        <nav aria-label="Folder" className="-mb-3 flex flex-wrap items-center gap-1.5 text-[15px]">
          {[{ id: null, name: "My Files" }, ...crumbs].map((c, i, all) => (
            <span key={c.id ?? "root"} className="flex items-center gap-1">
              {i > 0 && <span className="text-faint">/</span>}
              {i === all.length - 1
                ? <span className="font-semibold">{c.name}</span>
                : <button type="button" onClick={() => { setCwd(c.id); close(); }} className="font-semibold text-link">{c.name}</button>}
            </span>
          ))}
        </nav>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (!busy && e.dataTransfer.files.length) void upload(e.dataTransfer.files); }}
        className={`overflow-hidden rounded-[18px] border border-edge/10 bg-surface ${over ? "ring-2 ring-blue" : ""}`}
      >
        {newFolder !== null && (
          <form onSubmit={(e) => { e.preventDefault(); void createFolder(); }} className="flex items-center gap-2.5 border-b border-edge/[0.07] px-5 py-3.5">
            <FolderTile color={tab(newFolder || "?")} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <input autoFocus value={newFolder} onChange={(e) => setNewFolder(e.target.value)} maxLength={80} placeholder="Folder name" aria-label="Folder name" aria-invalid={taken(newFolder, cwd)} aria-describedby="folder-taken" className={field} />
              {taken(newFolder, cwd) && <span id="folder-taken" className="text-[13px] text-plum">A folder with this name is already here.</span>}
            </div>
            <Btn type="submit" disabled={taken(newFolder, cwd)}>Create</Btn>
            <Btn tone="plain" onClick={() => setNewFolder(null)}>Cancel</Btn>
          </form>
        )}
        {items.length ? (
          <ul className="m-0 list-none divide-y divide-edge/[0.07] p-0">
            {items.map((it) => {
              const { f } = it;
              const isOpen = open === f.id;
              const nested = it.type === "folder" ? inside(folders, f.id) : null;
              const count = nested ? files.filter((x) => x.folderId && nested.has(x.folderId)).length : 0;
              const clash = it.type === "folder" && rename?.id === f.id && taken(rename.value, it.f.parentId, f.id);
              return (
                <li key={f.id} className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    {it.type === "folder" ? (
                      <button type="button" onClick={() => { setCwd(f.id); setQ(""); close(); }} className="flex min-w-0 flex-1 items-center gap-3.5 text-left">
                        <FolderTile color={tab(f.name)} />
                        <span className="min-w-0">
                          <span className="block truncate text-[16px] font-semibold">{f.name}</span>
                          <span className="block text-[14px] text-faint">{needle ? label(it.f.parentId) : `Folder · ${count} ${count === 1 ? "file" : "files"}`}</span>
                        </span>
                      </button>
                    ) : (
                      <>
                        <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-peach text-[11px] font-bold tracking-[0.04em] text-[var(--peach-fg)]">{it.f.kind.toUpperCase()}</span>
                        <div className="min-w-0 flex-1">
                          {it.f.kind === "pdf"
                            ? <a href={`/api/files/${f.id}?view=1`} target="_blank" rel="noopener" className="block truncate text-[16px] font-semibold text-ink!">{f.name}</a>
                            : <a href={`/api/files/${f.id}`} className="block truncate text-[16px] font-semibold text-ink!">{f.name}</a>}
                          <div className="truncate text-[14px] text-faint">{it.f.kind.toUpperCase()} · {size(it.f.size)} · {date(f.createdAt)}{needle ? ` · ${label(it.f.folderId)}` : ""}</div>
                        </div>
                        <Link href={`/ai?ref=file:${f.id}&ask=summarise`} className={`${plainLink} max-sm:hidden`}>Summarise</Link>
                        <a href={`/api/files/${f.id}`} download className={`${plainLink} max-sm:hidden`}>Download</a>
                      </>
                    )}
                    <button type="button" aria-expanded={isOpen} aria-label={`More actions for ${f.name}`} onClick={() => { close(); if (!isOpen) setOpen(f.id); }} className="flex size-10 shrink-0 items-center justify-center rounded-full text-[20px] leading-none text-muted hover:bg-hover">⋯</button>
                  </div>
                  {isOpen && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 pl-[58px]">
                      {rename?.id === f.id ? (
                        <form onSubmit={(e) => { e.preventDefault(); if (!clash) void patch(it, { name: rename.value }); }} className="flex flex-1 gap-2">
                          <input autoFocus value={rename.value} onChange={(e) => setRename({ id: f.id, value: e.target.value })} maxLength={130} aria-label="New name" title={clash ? "A folder with this name is already here." : undefined} aria-invalid={clash} className={`${field} flex-1`} />
                          <Btn type="submit" disabled={clash}>Save</Btn>
                          <Btn tone="plain" onClick={() => setRename(null)}>Cancel</Btn>
                        </form>
                      ) : confirm === f.id ? (
                        <>
                          <span className="text-[15px]">{it.type === "folder" ? `Delete this folder${count ? ` and the ${count} ${count === 1 ? "file" : "files"} inside it` : ""}?` : "Delete this file?"}</span>
                          <Btn onClick={() => void remove(it)} className="!bg-plum">Delete</Btn>
                          <Btn tone="plain" onClick={() => setConfirm(null)}>Keep</Btn>
                        </>
                      ) : (
                        <>
                          {it.type === "file" && <a href={`/api/files/${f.id}`} download className={`${plainLink} sm:hidden`}>Download</a>}
                          {it.type === "file" && (
                            <>
                              <Link href={`/ai?ref=file:${f.id}&ask=summarise`} className={`${plainLink} sm:hidden`}>Summarise</Link>
                              <Link href={`/ai?ref=file:${f.id}&ask=issues`} className={plainLink}>Key issues</Link>
                              <Link href={`/ai?ref=file:${f.id}&ask=revision`} className={plainLink}>Revision notes</Link>
                            </>
                          )}
                          <Btn tone="plain" onClick={() => setRename({ id: f.id, value: it.type === "file" ? f.name.replace(/\.(pdf|docx)$/i, "") : f.name })}>Rename</Btn>
                          <label className="flex items-center gap-2 text-[15px] text-muted">
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
            <span className="flex size-12 items-center justify-center rounded-full bg-tint text-link"><Icon name="folder" size={20} /></span>
            <div className="font-display text-[26px] leading-tight">{needle ? "No matching files" : cwd ? "This folder is empty" : files.length ? "No files here" : "No files yet"}</div>
            <div className="max-w-[420px] text-[15px] text-muted">
              {needle ? "Try a different search or filter." : `Upload PDFs and Word documents, up to ${size(MAX_FILE_BYTES)} each, or drop them here.`}
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}

/** A folder: a card shape with its coloured tab. */
const FolderTile = ({ color }: { color: string }) => (
  <span aria-hidden className="relative flex h-11 w-11 shrink-0 items-end overflow-hidden rounded-[10px] bg-fill">
    <span className="absolute left-0 top-0 h-2 w-5 rounded-br-[6px]" style={{ background: color }} />
    <span className="h-1 w-full" style={{ background: color, opacity: 0.35 }} />
  </span>
);
