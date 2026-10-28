// Converts Notion API blocks into Markdown. Pure functions with no imports so they can be tested on their own.

type Annotations = { bold?: boolean; italic?: boolean; strikethrough?: boolean; code?: boolean };
export type RichText = { plain_text: string; href?: string | null; annotations?: Annotations };
export type Block = {
  id: string;
  type: string;
  has_children?: boolean;
  children?: Block[];
  [k: string]: unknown;
};

/** Removes stray HTML tags Notion sometimes keeps from pasted text, and collapses whitespace. */
export const cleanTitle = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export function richText(rt: RichText[] = []): string {
  return rt.map((t) => {
    const s = t.plain_text;
    if (!s) return "";
    const a = t.annotations ?? {};
    // Markers must hug the text, so move edge whitespace outside them.
    const lead = /^\s*/.exec(s)![0];
    const trail = /\s*$/.exec(s)![0];
    let core = s.trim();
    if (!core) return s;
    if (a.code) core = "`" + core + "`";
    if (a.bold) core = `**${core}**`;
    if (a.italic) core = `*${core}*`;
    if (a.strikethrough) core = `~~${core}~~`;
    if (t.href) core = `[${core}](${t.href})`;
    return lead + core + trail;
  }).join("");
}

const text = (b: Block) => richText(((b[b.type] as { rich_text?: RichText[] } | undefined)?.rich_text) ?? []);

function render(blocks: Block[], depth: number, out: string[]) {
  const pad = "  ".repeat(depth);
  let n = 0;
  for (let bi = 0; bi < blocks.length; bi++) {
    const b = blocks[bi];
    if (b.type !== "numbered_list_item") n = 0;
    const kids = () => (b.children?.length ? b.children : []);
    switch (b.type) {
      case "paragraph": { const t = text(b); out.push(t ? pad + t : ""); render(kids(), depth, out); break; }
      case "heading_1": out.push(`## ${text(b)}`, ""); break; // page title is the h1, so top headings become chapters
      case "heading_2": out.push(`## ${text(b)}`, ""); break;
      case "heading_3": out.push(`### ${text(b)}`, ""); break;
      case "bulleted_list_item": out.push(`${pad}- ${text(b)}`); render(kids(), depth + 1, out); break;
      case "numbered_list_item": out.push(`${pad}${++n}. ${text(b)}`); render(kids(), depth + 1, out); break;
      case "to_do": out.push(`${pad}- ${(b.to_do as { checked?: boolean }).checked ? "[x]" : "[ ]"} ${text(b)}`); break;
      case "quote": out.push(`> ${text(b)}`, ""); break;
      case "callout": {
        const icon = (b.callout as { icon?: { emoji?: string } }).icon?.emoji;
        out.push(`> ${icon ? icon + " " : ""}${text(b)}`, "");
        break;
      }
      case "code": {
        const c = b.code as { language?: string; rich_text?: RichText[] };
        out.push("```" + (c.language && c.language !== "plain text" ? c.language : ""), (c.rich_text ?? []).map((t) => t.plain_text).join(""), "```", "");
        break;
      }
      case "divider": out.push("---", ""); break;
      case "toggle": out.push(`**${text(b)}**`, ""); render(kids(), depth, out); break;
      case "table": {
        const rows = kids().filter((r) => r.type === "table_row").map((r) => ((r.table_row as { cells: RichText[][] }).cells).map((c) => richText(c).replace(/\|/g, "\\|") || " "));
        if (rows.length) {
          out.push(`| ${rows[0].join(" | ")} |`, `| ${rows[0].map(() => "---").join(" | ")} |`);
          for (const r of rows.slice(1)) out.push(`| ${r.join(" | ")} |`);
          out.push("");
        }
        break;
      }
      case "image": {
        const im = b.image as { type: string; external?: { url: string }; caption?: RichText[] };
        // Notion-hosted file URLs expire within the hour, so only external images are kept.
        if (im.type === "external" && im.external?.url) out.push(`![${richText(im.caption)}](${im.external.url})`, "");
        break;
      }
      case "bookmark": case "link_preview": case "embed": {
        const u = (b[b.type] as { url?: string }).url;
        if (u) out.push(`[${u}](${u})`, "");
        break;
      }
      case "column_list": case "column": case "synced_block": render(kids(), depth, out); break;
      default: break; // child_database, child_page, unsupported blocks
    }
    // Blank lines keep Markdown paragraphs separate and end a list before the next kind of block.
    if (depth === 0 && b.type === "paragraph") out.push("");
    if (depth === 0 && /_list_item$|^to_do$/.test(b.type) && blocks[bi + 1]?.type !== b.type) out.push("");
  }
}

export function blocksToMarkdown(blocks: Block[]): string {
  const out: string[] = [];
  render(blocks, 0, out);
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
