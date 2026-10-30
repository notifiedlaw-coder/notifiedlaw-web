import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { areFriends } from "@/lib/friends";
import { conversation } from "@/lib/messages";
import { Conversation } from "../conversation";

/** A conversation with a friend. Opening it marks their messages read, which starts their 30 days. */
export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, s] = await Promise.all([params, getSession()]);
  if (!s) redirect("/login");
  if (!(await areFriends(s.user.id, id))) redirect("/friends");
  const { messages, seen } = await conversation(s.user.id, id);
  return <Conversation key={id} friendId={id} initial={messages} initialSeen={seen} />;
}
