#!/usr/bin/env node
// Adds or updates an article straight in D1, with no Notion step.
//
//   node scripts/add-article.mjs articles/my-article.md            # local database
//   node scripts/add-article.mjs articles/my-article.md --remote   # live database
//   node scripts/add-article.mjs articles/my-article.md --print    # show the SQL only
//
// The file is Markdown with a front-matter block, then the article body (use "## " for section headings):
//
//   ---
//   title: Walking the Tightrope ...
//   slug: free-speech-dignity-defamation-cases   (optional; made from the title)
//   author: Akua Gyamfuah Twumasi
//   date: 2025-08-15
//   summary: One or two sentences, shown on cards and as the direct answer for search engines.
//   area: Constitutional law
//   industry: Media
//   image: /articles/my-article.webp             (a file in public/articles, or a full URL)
//   tags: Defamation, Free speech, Media law
//   ---
//
// Re-running with the same slug replaces the article. Rows get a far-future sync time, so the Notion sync
// (which deletes rows it did not write) never removes them. Run `wrangler d1 migrations apply` first if the
// article_tag table is missing. Needs Node 22 for Wrangler.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [file, ...flags] = process.argv.slice(2);
if (!file) { console.error("Usage: node scripts/add-article.mjs <article.md> [--remote | --print]"); process.exit(1); }

const raw = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
if (!m) { console.error("Missing front matter: the file must start with a --- block."); process.exit(1); }
const meta = Object.fromEntries(m[1].split("\n").map((l) => /^([A-Za-z]+):\s*(.*)$/.exec(l)).filter(Boolean).map((x) => [x[1].toLowerCase(), x[2].trim()]));
const body = m[2].trim();
if (!meta.title || !body) { console.error("An article needs a title and a body."); process.exit(1); }

const slugify = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const slug = meta.slug || slugify(meta.title);
const id = `article-${slug}`;
const tags = (meta.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
const date = meta.date || new Date().toISOString().slice(0, 10);
const props = { Summary: meta.summary || "", Area: meta.area || "", Industry: meta.industry || "", Date: date, Author: meta.author || "", Image: meta.image || "", Tags: tags };
const FAR_FUTURE = 4102444800000; // 2100-01-01

const sql = [
  `DELETE FROM article_tag WHERE entry_id = ${q(id)};`,
  `DELETE FROM cms_entry WHERE id = ${q(id)};`,
  `INSERT INTO cms_entry (id, kind, title, slug, position, props, body, stage, published, notion_edited_at, synced_at) VALUES (${q(id)}, 'article', ${q(meta.title)}, ${q(slug)}, 0, ${q(JSON.stringify(props))}, ${q(body)}, 'Publish', 1, ${q(date)}, ${FAR_FUTURE});`,
  ...[...new Map(tags.map((t) => [slugify(t), t]))].filter(([s]) => s).map(([s, t]) => `INSERT INTO article_tag (entry_id, tag, slug) VALUES (${q(id)}, ${q(t)}, ${q(s)});`),
].join("\n");

if (flags.includes("--print")) { console.log(sql); process.exit(0); }

const tmp = join(mkdtempSync(join(tmpdir(), "article-")), "article.sql");
writeFileSync(tmp, sql);
const where = flags.includes("--remote") ? "--remote" : "--local";
execFileSync("npx", ["wrangler", "d1", "execute", "notifiedlaw-db", where, `--file=${tmp}`], { stdio: "inherit" });
console.log(`\n${where === "--remote" ? "Live" : "Local"}: /articles/${slug}`);
