import { buildDocx, type Block } from "@/lib/docx";
import type { Ref } from "@/lib/ai/refs";

const dateText = (d: Date) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Accra" }).format(d);

/** Markdown inline marks removed: **bold**, *italic*, `code`, ~~strike~~ and [text](link) become their text. */
const plain = (s: string) => s.replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1").replace(/(\*\*\*|\*\*|\*|~~|`)/g, "").trim();

/** An answer's Markdown as document blocks: headings, bullets, numbered points and paragraphs (tables become lines of text). */
export function markdownBlocks(md: string): Block[] {
  const out: Block[] = [];
  let para: string[] = [];
  const flush = () => { if (para.length) out.push({ t: "p", text: plain(para.join(" ")) }); para = []; };
  for (const raw of md.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    let m: RegExpExecArray | null;
    if (!line) flush();
    else if (/^[-*_]{3,}$/.test(line) || /^\|?[\s:|-]+\|?$/.test(line)) flush();
    else if ((m = /^#{1,6}\s+(.*)$/.exec(line))) { flush(); out.push({ t: "h2", text: plain(m[1]) }); }
    else if ((m = /^(?:[-*+]|\d+[.)])\s+(.*)$/.exec(raw.trim()))) { flush(); out.push({ t: "bullet", text: plain(m[1]) }); }
    else if (line.startsWith("|")) { flush(); out.push({ t: "p", text: plain(line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()).join("  ·  ")) }); }
    else if (line.startsWith(">")) { flush(); out.push({ t: "p", text: plain(line.replace(/^>\s?/, "")) }); }
    else para.push(line);
  }
  flush();
  return out.filter((b) => b.t === "table" || b.text);
}

/** A Notified AI answer as a Word document: the question, the answer, and the sources it was given. */
export function answerDocx(o: { title: string; question: string; answer: string; sources: Ref[]; now?: Date }) {
  const blocks: Block[] = [
    { t: "title", text: o.title },
    { t: "note", text: `Notified AI answer, ${dateText(o.now ?? new Date())}. AI can make mistakes: check important points against the law itself.` },
    { t: "h1", text: "Question" },
    ...markdownBlocks(o.question),
    { t: "h1", text: "Answer" },
    ...markdownBlocks(o.answer),
  ];
  if (o.sources.length) blocks.push({ t: "h1", text: "Sources" }, ...o.sources.map((s, i): Block => ({ t: "bullet", text: `[${i + 1}] ${s.name}` })));
  return buildDocx(blocks);
}
