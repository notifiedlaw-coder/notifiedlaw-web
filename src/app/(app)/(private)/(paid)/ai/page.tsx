import { redirect } from "next/navigation";
import { getPlan, getSession } from "@/lib/auth";
import { getCaseBriefs, getCourses } from "@/lib/cms";
import { LEVELS, topicLock } from "@/lib/data";
import { filesFor } from "@/lib/files";
import { chatsOf, creditsLeft } from "@/lib/ai/chats";
import { kimiConfigured } from "@/lib/ai/kimi";
import type { Mentionable, RefKind } from "@/lib/ai/refs";
import { NotifiedAi } from "./notified-ai";

export const metadata = { title: "Notified AI" };

// Conversations and files are per user, so this page is rendered on request.
export const dynamic = "force-dynamic";

/** A file's text length is not known until it is read, so the credit estimate guesses from its size. */
const fileChars = (kind: string, size: number) => Math.round(kind === "pdf" ? size / 5 : size * 1.5);

export default async function Page({ searchParams }: { searchParams: Promise<{ ref?: string; ask?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/login");
  const [chats, credits, files, cases, courses, plan, q] = await Promise.all([
    chatsOf(s.user.id), creditsLeft(s.user.id), filesFor(s.user.id), getCaseBriefs(), getCourses(), getPlan(), searchParams,
  ]);

  const folder = new Map(files.folders.map((f) => [f.id, f.name]));
  const mentions: Mentionable[] = [
    ...files.files.map((f): Mentionable => ({ kind: "file", id: f.id, name: f.name, href: "/files", sub: `${f.folderId ? folder.get(f.folderId) ?? "Folder" : "My Files"} · ${f.kind.toUpperCase()}`, chars: fileChars(f.kind, f.size) })),
    ...cases.map((c): Mentionable => ({ kind: "case", id: c.id, name: c.title, href: `/case-law/${c.slug}`, sub: [c.cite, c.court].filter(Boolean).join(" · ") || "Case brief", chars: c.body.length })),
    ...LEVELS.flatMap((level) => courses[level].flatMap((c) => c.topics.flatMap((t, i): Mentionable[] =>
      t.ready && !topicLock(plan, level, i + 1) ? [{ kind: "topic", id: t.id, name: t.title, href: `/library/${c.slug}/${i + 1}`, sub: c.title, chars: t.mins * 1200 }] : []))),
  ];

  // /ai?ref=file:<id>|case:<id>|topic:<id>&ask=summarise|issues|revision opens with that attached and the question written.
  const [kind, id] = (q.ref ?? "").split(":");
  const ref = mentions.find((m) => m.kind === (kind as RefKind) && m.id === id);
  const ask = q.ask === "summarise" || q.ask === "issues" || q.ask === "revision" ? q.ask : null;

  return <NotifiedAi chats={chats} credits={credits} mentions={mentions} ready={kimiConfigured()} initial={ref ? { ref, ask } : null} />;
}
