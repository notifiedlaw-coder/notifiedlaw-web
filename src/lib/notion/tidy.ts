// Notes are often pasted into Notion from a PDF, which leaves every printed line as its own paragraph, typographic
// ligatures (ﬀ, ﬁ) in the words, and headings that are only bold or capital lines. This puts the text back
// together: lines that continue a sentence are joined into paragraphs (and list items), ligatures become plain
// letters, ALL-CAPS lines become chapters ("## ") and bold-only lines become subheadings ("### ").
// Running it again on its own output changes nothing.

/** Raise this whenever the rules below change, so the next sync reads every page from Notion again. */
export const TIDY_VERSION = 3;

const LIGATURES: Record<string, string> = { "ﬀ": "ff", "ﬁ": "fi", "ﬂ": "fl", "ﬃ": "ffi", "ﬄ": "ffl", "ﬅ": "st", "ﬆ": "st" };
const SMALL = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on", "or", "the", "to", "v", "vs", "with"]);

/** Lines Markdown gives a meaning of their own, which are never joined to the text around them. */
const BLOCK = /^(#{1,4}\s|>|```|\||!\[|-{3,}\s*$)/;
/** A list item: a bullet, or a one- or two-digit number (so "2005. She wrote" is not taken for item 2005). */
const LIST = /^\s*([-*+]|\d{1,2}\.)\s/;
const BOLD_LINE = /^\*\*([^*]+)\*\*$/;
/** A sentence or clause ends here, so the next line starts a new paragraph. */
const ENDS = /[.!?:;”"’)\]]$/;

const plain = (s: string) => s.replace(/\*\*/g, "").trim();
/** An all-caps heading. Numbers only as a leading "2. ", so a citation run-on such as "SCGLR 946." is not one. */
const isCaps = (s: string) => {
  const t = plain(s);
  return t.length >= 3 && t.length <= 90 && /[A-Z]{2}/.test(t) && !/[a-z]/.test(t) && !/\d/.test(t.replace(/^\d{1,2}\.\s/, "")) && !/[[\]]/.test(t);
};
const lastWord = (s: string) => (/(\w+)\W*$/.exec(plain(s))?.[1] ?? "").toLowerCase();
/** A bold heading that runs on to the next bold line, rather than two headings in a row. */
const boldRunsOn = (a: string, b: string) => {
  const x = plain(a);
  const y = plain(b);
  return /^\d{1,2}\.?$/.test(x) || /^[a-z]/.test(y) || (!ENDS.test(x) && (SMALL.has(lastWord(a)) || /^\d{1,2}\.\s/.test(x)));
};
const isBoldLine = (s: string) => BOLD_LINE.test(s) && plain(s).length <= 120;
/**
 * A bold line that is a subheading. One with figures in it ("Falck v. Williams [1900] AC 176") is a citation, and
 * one ending in ";" or "," is a bold sentence leading into what follows.
 */
const isBoldHeading = (s: string) => isBoldLine(s) && !/\d/.test(plain(s).replace(/^\d{1,2}\.\s/, "")) && !/[;,]$/.test(plain(s));

/** "OFFER AND ACCEPTANCE" → "Offer and Acceptance". Short all-caps words that look like abbreviations stay as they are. */
function titleCase(s: string) {
  return s.toLowerCase().split(/(\s+)/).map((w, i) => {
    if (/^\s+$/.test(w)) return w;
    if (i > 0 && SMALL.has(w.replace(/[^a-z]/g, ""))) return w;
    return w.replace(/[a-z]/, (c) => c.toUpperCase());
  }).join("");
}

export function tidyMarkdown(md: string): string {
  const text = md.replace(/[ﬀﬁﬂﬃﬄﬅﬆ]/g, (c) => LIGATURES[c]);
  const out: string[] = [];
  let fenced = false;
  for (const raw of text.split(/\n{2,}/)) {
    let p = raw.replace(/[ \t]+$/gm, "");
    if (!p.trim()) continue;
    const fences = (p.match(/^```/gm) ?? []).length;
    if (fenced || fences) { out.push(p); if (fences % 2) fenced = !fenced; continue; }
    // Line breaks inside a plain paragraph are the PDF's; a paragraph holding a list or other Markdown keeps them.
    const lines = p.split("\n");
    if (lines.length > 1 && !lines.some((l) => BLOCK.test(l) || LIST.test(l))) p = lines.reduce((a, l) => (/[a-z]-$/.test(a) ? a.slice(0, -1) + l.trim() : `${a} ${l.trim()}`));
    const prev = out[out.length - 1];
    // Only single-line pieces are joined; anything that still spans several lines is left alone.
    const single = !p.includes("\n") && !BLOCK.test(p) && !LIST.test(p);
    if (prev !== undefined && single && !prev.includes("\n") && !BLOCK.test(prev)) {
      // A bold heading broken over two lines.
      if (isBoldLine(prev) && isBoldLine(p) && boldRunsOn(prev, p)) { out[out.length - 1] = `**${plain(prev)} ${plain(p)}**`; continue; }
      // A sentence running on to the next line. Headings never take the line after them.
      const open = !isBoldHeading(prev) && !isCaps(prev) && (!ENDS.test(prev.replace(/\*+$/, "")) || /\bv\.\**$/.test(prev) || /^[a-z]/.test(p) || /^[\d\s.,;:()[\]-]+$/.test(p) || (/[;,]$/.test(prev) && /^\[\d{4}/.test(p)));
      if (open && !isCaps(p)) {
        out[out.length - 1] = /[a-z]-$/.test(prev) ? prev.slice(0, -1) + p : `${prev} ${p.trim()}`;
        continue;
      }
    }
    out.push(p.trim() === p ? p : p.replace(/^\s+/, (m) => (LIST.test(p) ? m : "")));
  }
  return out.map((p) => {
    // A Notion heading made bold, or all caps, arrives as "## **NATURE OF CONTRACT**": headings are bold
    // already, so the markers go, and capitals become title case like the headings made from plain lines.
    const h = /^(#{1,4})\s+(.*)$/.exec(p);
    if (h && !p.includes("\n")) {
      const t = h[2].replace(/\*\*/g, "").replace(/^[*_](.*)[*_]$/, "$1").trim();
      return `${h[1]} ${(isCaps(t) ? titleCase(t) : t).replace(/[.:]$/, "")}`;
    }
    if (p.includes("\n") || BLOCK.test(p) || LIST.test(p)) return p;
    if (isCaps(p)) return `## ${titleCase(plain(p)).replace(/[.:]$/, "")}`;
    if (isBoldHeading(p)) return `### ${plain(p).replace(/[.:]$/, "")}`;
    return p;
  }).join("\n\n");
}
