import type { ReactNode } from "react";

// A small Markdown renderer for content synced from Notion. It builds React elements (no raw HTML), and only
// links to http(s), mailto and site-relative URLs. Covers what the sync emits: headings, paragraphs, nested
// lists, quotes, callouts ("> [!callout] title", shown as a card), code, rules, tables, bold, italic,
// strikethrough, inline code and links. Quotes and callouts may hold any of the others.

/** Line endings made "\n", and Notion's no-break spaces made plain ones: a run of them never wraps, and pushed lines off the screen. */
const tidy = (md: string) => md.replace(/\r\n/g, "\n").replace(/[\u00A0\u2007\u202F]/g, " ");

// "//host" and "/\host" look site-relative but open another site, so a bare slash must start a path.
const safeHref = (u: string) => (/^(https?:|mailto:|\/(?![/\\]))/i.test(u) ? u : "#");

function inline(text: string, key = ""): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`]+`)|(\*\*\*[^*]+\*\*\*)|(\*\*[^*]+\*\*)|(~~[^~]+~~)|(\*[^*\n]+\*)|(\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const k = `${key}${i++}`;
    if (m[1]) out.push(<code key={k} className="rounded bg-fill px-1 py-0.5 text-[0.9em]">{t.slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={k}><em>{inline(t.slice(3, -3), k)}</em></strong>);
    else if (m[3]) out.push(<strong key={k}>{inline(t.slice(2, -2), k)}</strong>);
    else if (m[4]) out.push(<s key={k}>{inline(t.slice(2, -2), k)}</s>);
    else if (m[5]) out.push(<em key={k}>{inline(t.slice(1, -1), k)}</em>);
    else {
      const [, label, href] = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(t)!;
      const to = safeHref(href);
      out.push(<a key={k} href={to} rel={/^https?:/i.test(to) ? "noopener noreferrer" : undefined} style={{ color: "var(--color-link)" }}>{inline(label, k)}</a>);
    }
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type ListItem = { text: string; children: ListItem[] };

/** Builds a nested list from consecutive list lines; nesting follows 2-space (or tab) indentation. */
function readList(lines: string[], start: number): { ordered: boolean; items: ListItem[]; next: number } {
  const re = /^(\s*)([-*+]|\d+\.)\s+(.*)$/;
  const first = re.exec(lines[start])!;
  const ordered = /\d/.test(first[2]);
  const root: ListItem[] = [];
  const stack: { indent: number; items: ListItem[] }[] = [{ indent: first[1].replace(/\t/g, "  ").length, items: root }];
  let i = start;
  for (; i < lines.length; i++) {
    const m = re.exec(lines[i]);
    if (!m) break;
    const indent = m[1].replace(/\t/g, "  ").length;
    while (stack.length > 1 && indent < stack[stack.length - 1].indent) stack.pop();
    let top = stack[stack.length - 1];
    if (indent > top.indent) {
      const parent = top.items[top.items.length - 1];
      if (parent) { const nested = { indent, items: parent.children }; stack.push(nested); top = nested; }
    }
    top.items.push({ text: m[3], children: [] });
  }
  return { ordered, items: root, next: i };
}

// Body text is justified, as in a printed textbook. Hyphenation keeps narrow phone columns free of wide gaps.
const JUSTIFY = "text-justify hyphens-auto";

function List({ ordered, items, k }: { ordered: boolean; items: ListItem[]; k: string }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={`my-3 space-y-1.5 pl-6 ${ordered ? "list-decimal" : "list-disc"}`}>
      {items.map((it, i) => (
        <li key={i} className={JUSTIFY}>
          {inline(it.text, `${k}${i}`)}
          {it.children.length > 0 && <List ordered={ordered} items={it.children} k={`${k}${i}`} />}
        </li>
      ))}
    </Tag>
  );
}

/** `from` is the heading level that "###" becomes, so the body nests under the page's own h1/h2. */
export function Markdown({ source, from = 3 }: { source: string; from?: 2 | 3 }) {
  const lines = tidy(source).split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    const k = `b${key++}`;
    if (!line.trim()) { i++; continue; }
    const fence = /^```(\w*)/.exec(line);
    if (fence) {
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i].startsWith("```"); i++) code.push(lines[i]);
      i++;
      out.push(<pre key={k} className="my-4 whitespace-pre-wrap break-words rounded-xl bg-fill p-4 text-[14px] leading-relaxed"><code>{code.join("\n")}</code></pre>);
      continue;
    }
    const h = /^(#{1,5})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const cls = ["", "mb-3 mt-8 text-[26px] font-bold leading-tight", "mb-2.5 mt-7 text-[23px] font-bold leading-tight", "mb-2 mt-7 text-[20px] font-bold leading-snug", "mb-1.5 mt-6 text-[17px] font-bold leading-snug", "mb-1.5 mt-5 text-[16px] font-semibold leading-snug"][level];
      // "###" (a sub-chapter) is the `from` level; deeper ones step down from it.
      const Tag = `h${Math.min(6, from + Math.max(0, level - 3))}` as "h3";
      out.push(<Tag key={k} className={`${cls} tracking-[-0.01em]`}>{inline(h[2], k)}</Tag>);
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) { out.push(<hr key={k} className="my-6 border-0 border-t border-edge/15" />); i++; continue; }
    if (line.startsWith(">")) {
      const q: string[] = [];
      for (; i < lines.length && lines[i].startsWith(">"); i++) q.push(lines[i].replace(/^>\s?/, ""));
      const callout = /^\[!callout\]\s*(.*)$/.exec(q[0] ?? "");
      const last = "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0";
      if (callout) {
        out.push(
          <aside key={k} className={`my-6 rounded-2xl bg-fill px-4 py-4 text-[0.94em] shadow-[inset_0_0_0_0.5px_var(--hairline)] sm:px-5 ${last}`}>
            {callout[1] && <p className="mb-3 font-bold leading-snug">{inline(callout[1], k)}</p>}
            <Markdown source={q.slice(1).join("\n")} from={from} />
          </aside>,
        );
      } else {
        out.push(<blockquote key={k} className={`my-4 rounded-r-xl border-l-[3px] border-amber-soft bg-fill px-4 py-3 ${last}`}><Markdown source={q.join("\n")} from={from} /></blockquote>);
      }
      continue;
    }
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const { ordered, items, next } = readList(lines, i);
      out.push(<List key={k} ordered={ordered} items={items} k={k} />);
      i = next;
      continue;
    }
    if (line.includes("|") && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] ?? "")) {
      const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(line);
      const rows: string[][] = [];
      for (i += 2; i < lines.length && lines[i].includes("|"); i++) rows.push(cells(lines[i]));
      out.push(
        <div key={k} className="my-5 overflow-hidden rounded-xl shadow-[inset_0_0_0_0.5px_var(--hairline)]"><table className="w-full border-collapse text-[14px] [overflow-wrap:anywhere] leading-snug [&_tr:last-child>td]:border-b-0">
          <thead><tr>{head.map((c, j) => <th key={j} className="border-b border-edge/20 bg-fill px-3 py-2 text-left align-bottom font-semibold">{inline(c, `${k}h${j}`)}</th>)}</tr></thead>
          <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((c, j) => <td key={j} className="border-b border-edge/10 px-3 py-2 align-top">{inline(c, `${k}${ri}${j}`)}</td>)}</tr>)}</tbody>
        </table></div>,
      );
      continue;
    }
    const para: string[] = [];
    for (; i < lines.length && lines[i].trim() && !/^(#{1,5}\s|>|```|\s*([-*+]|\d+\.)\s+|-{3,}\s*$)/.test(lines[i]); i++) para.push(lines[i]);
    out.push(<p key={k} className={`mb-4 ${JUSTIFY}`}>{inline(para.join(" "), k)}</p>);
  }
  return <>{out}</>;
}

/**
 * Splits a Markdown body into chapters at each "## " heading; text before the first heading is its own chapter.
 * A heading with nothing under it before the next one (a Notion page with a heading 1 straight above a
 * heading 2) is the chapter's title, and the heading after it becomes the chapter's first subheading.
 */
export function splitChapters(body: string, fallbackTitle: string): { title: string; md: string }[] {
  const parts = tidy(body).split(/^(?=##\s)/m).map((p) => p.trim()).filter(Boolean);
  const chapters: { title: string; md: string }[] = [];
  let empty: string | null = null;
  for (const p of parts) {
    const m = /^##\s+(.*)\n?([\s\S]*)$/.exec(p);
    const c = m ? { title: m[1].trim(), md: m[2].trim() } : { title: fallbackTitle, md: p };
    if (empty !== null && m) chapters.push({ title: empty, md: `### ${c.title}\n\n${c.md}`.trim() });
    else if (m && !c.md) { empty = c.title; continue; }
    else chapters.push(c);
    empty = null;
  }
  if (empty !== null) chapters.push({ title: empty, md: "" });
  return chapters.length ? chapters : [{ title: fallbackTitle, md: "" }];
}

/** A sub-chapter ("###", level 3) or section ("####", level 4) heading and the page it is on. */
export type PageHead = { level: 3 | 4; title: string };

/**
 * title: the sub-chapter or section the page opens in (null while still in the chapter's opening text); cont: the page
 * opens partway through it; heads: the sub-chapter and section headings that start on the page.
 */
export type Page = { chapter: number; chapterTitle: string; title: string | null; cont: boolean; heads: PageHead[]; md: string };

/** About how much Markdown fills a page: some 450 words, two or three minutes' reading. */
const PAGE_CHARS = 3000;

/** A body's blocks: runs of lines between blank lines, keeping a code fence whole. */
function blocks(md: string): string[] {
  const out: string[] = [];
  let cur: string[] = [];
  let fence = false;
  for (const line of md.split("\n")) {
    if (line.startsWith("```")) fence = !fence;
    if (!fence && !line.trim()) { if (cur.length) out.push(cur.join("\n")); cur = []; continue; }
    cur.push(line);
  }
  if (cur.length) out.push(cur.join("\n"));
  return out;
}

const headOf = (b: string): PageHead | null => {
  const m = /^(#{3,4})\s+(.*)$/.exec(b);
  return m && !b.includes("\n") ? { level: m[1].length as 3 | 4, title: m[2].trim() } : null;
};

/**
 * A topic as pages, like a book: each chapter ("## ", a Notion heading 1) starts on a new page, and its text flows
 * across pages of about equal length (some PAGE_CHARS each), only its last page running short. Pages break between
 * blocks (a paragraph, list, quote or card is never cut), and a heading at the foot of a page moves to the next.
 */
export function splitPages(body: string, fallbackTitle: string): Page[] {
  return splitChapters(body, fallbackTitle).flatMap((c, chapter) => {
    const bs = blocks(c.md);
    const total = bs.reduce((n, b) => n + b.length, 0);
    const size = total / Math.max(1, Math.round(total / PAGE_CHARS));
    // Each block goes on the page its middle falls in, so pages come out as even as whole blocks allow.
    const groups: string[][] = [];
    let at = 0;
    for (const b of bs) {
      const i = Math.min(groups.length, Math.floor((at + b.length / 2) / size));
      (groups[i] ??= []).push(b);
      at += b.length;
    }
    for (let i = 0; i < groups.length - 1; i++) {
      while (groups[i].length > 1 && /^#{3,5}\s/.test(groups[i][groups[i].length - 1])) groups[i + 1].unshift(groups[i].pop()!);
    }
    let open: string | null = null;
    const pages = groups.filter((g) => g?.length).map((g): Page => {
      const heads = g.map(headOf).filter((h): h is PageHead => h !== null);
      const first = headOf(g[0]);
      const page = { chapter, chapterTitle: c.title, title: first?.title ?? open, cont: !first && open !== null, heads, md: g.join("\n\n") };
      if (heads.length) open = heads[heads.length - 1].title;
      return page;
    });
    return pages.length ? pages : [{ chapter, chapterTitle: c.title, title: null, cont: false, heads: [], md: "" }];
  });
}
