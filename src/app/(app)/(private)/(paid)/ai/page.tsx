import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { filesFor } from "@/lib/files";
import { chatsOf, creditsLeft } from "@/lib/ai/chats";
import { kimiConfigured } from "@/lib/ai/kimi";
import { NotifiedAi } from "./notified-ai";

export const metadata = { title: "Notified AI" };

// Conversations and files are per user, so this page is rendered on request.
export const dynamic = "force-dynamic";

export default async function Page() {
  const s = await getSession();
  if (!s) redirect("/login");
  const [chats, credits, files] = await Promise.all([chatsOf(s.user.id), creditsLeft(s.user.id), filesFor(s.user.id)]);
  return <NotifiedAi chats={chats} credits={credits} files={files.files} folders={files.folders} ready={kimiConfigured()} />;
}
