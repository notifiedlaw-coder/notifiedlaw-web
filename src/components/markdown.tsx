import type { ReactNode } from "react";

// A small Markdown renderer for content synced from Notion. It builds React elements (no raw HTML), and only
// links to http(s), mailto and site-relative URLs. Covers what the sync emits: headings, paragraphs, nested
// lists, quotes, code, rules, tables, bold, italic, strikethrough, inline code and links.

const safeHref = (u: string) => (/^(https?:|mailto:|\/)/i.test(u) ? u : "#");

function inline(text: string, key = ""): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(~~[^~]+~~)|(\*[^*\n]+\*)|(\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const k = `${key}${i++}`;
    if (m[1]) out.push(<code key={k} className="rounded bg-fill px-1 py-0.5 text-[0.9em]">{t.slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={k}>{inline(t.slice(2, -2), k)}</strong>);
    else if (m[3]) out.push(<s key={k}>{inline(t.slice(2, -2), k)}</s>);
    else if (m[4]) out.push(<em key={k}>{inline(t.slice(1, -1), k)}</em>);
    else {
      const [, label, href] = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(t)!;
      out.push(<a key={k} href={safeHref(href)} style={{ color: "var(--color-link)" }}>{inline(label, k)}</a>);
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

function List({ ordered, items, k }: { ordered: boolean; items: ListItem[]; k: string }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={`my-3 space-y-1.5 pl-6 ${ordered ? "list-decimal" : "list-disc"}`}>
      {items.map((it, i) => (
        <li key={i}>
          {inline(it.text, `${k}${i}`)}
          {it.children.length > 0 && <List ordered={ordered} items={it.children} k={`${k}${i}`} />}
        </li>
      ))}
    </Tag>
  );
}

/** `from` is the heading level that "###" becomes, so the body nests under the page's own h1/h2. */
export function Markdown({ source, from = 3 }: { source: string; from?: 2 | 3 }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
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
      out.push(<pre key={k} className="my-4 overflow-x-auto rounded-xl bg-fill p-4 text-[14px] leading-relaxed"><code>{code.join("\n")}</code></pre>);
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const cls = ["", "mb-3 mt-8 text-[28px] font-bold", "mb-2.5 mt-7 text-[26px] font-bold", "mb-2 mt-6 text-[21px] font-bold", "mb-2 mt-5 text-[18px] font-bold"][level];
      const Tag = `h${level >= 4 ? from + 1 : from}` as "h3";
      out.push(<Tag key={k} className={`${cls} tracking-[-0.01em]`}>{inline(h[2], k)}</Tag>);
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) { out.push(<hr key={k} className="my-6 border-0 border-t border-edge/15" />); i++; continue; }
    if (line.startsWith(">")) {
      const q: string[] = [];
      for (; i < lines.length && lines[i].startsWith(">"); i++) q.push(lines[i].replace(/^>\s?/, ""));
      out.push(<blockquote key={k} className="my-4 rounded-r-xl border-l-[3px] border-amber-soft bg-fill px-4 py-3">{q.join(" ").trim() ? inline(q.join(" "), k) : null}</blockquote>);
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
        <div key={k} className="my-4 overflow-x-auto"><table className="w-full border-collapse text-[15px]">
          <thead><tr>{head.map((c, j) => <th key={j} className="border-b border-edge/20 px-3 py-2 text-left font-semibold">{inline(c, `${k}h${j}`)}</th>)}</tr></thead>
          <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((c, j) => <td key={j} className="border-b border-edge/10 px-3 py-2 align-top">{inline(c, `${k}${ri}${j}`)}</td>)}</tr>)}</tbody>
        </table></div>,
      );
      continue;
    }
    const para: string[] = [];
    for (; i < lines.length && lines[i].trim() && !/^(#{1,4}\s|>|```|\s*([-*+]|\d+\.)\s+|-{3,}\s*$)/.test(lines[i]); i++) para.push(lines[i]);
    out.push(<p key={k} className="mb-4">{inline(para.join(" "), k)}</p>);
  }
  return <>{out}</>;
}

/** Splits a Markdown body into chapters at each "## " heading; text before the first heading is its own chapter. */
export function splitChapters(body: string, fallbackTitle: string): { title: string; md: string }[] {
  const parts = body.replace(/\r\n/g, "\n").split(/^(?=##\s)/m).map((p) => p.trim()).filter(Boolean);
  const chapters = parts.map((p) => {
    const m = /^##\s+(.*)\n?([\s\S]*)$/.exec(p);
    return m ? { title: m[1].trim(), md: m[2].trim() } : { title: fallbackTitle, md: p };
  });
  return chapters.length ? chapters : [{ title: fallbackTitle, md: "" }];
}
