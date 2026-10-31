import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { areFriends, people } from "@/lib/friends";
import { conversation, hasHistory } from "@/lib/messages";
import { Conversation } from "../conversation";

/**
 * A conversation with a friend. Opening it marks their messages read, which moves their delete date to 30 days from now.
 * One that outlived the friendship opens read-only, to look back on or report, until its messages expire.
 */
export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, s] = await Promise.all([params, getSession()]);
  if (!s) redirect("/login");
  const friends = await areFriends(s.user.id, id);
  if (!friends && !(await hasHistory(s.user.id, id))) redirect("/friends");
  const [{ messages, seen }, names] = await Promise.all([conversation(s.user.id, id), people([id])]);
  const other = { id, name: names.get(id)?.name ?? "Notified Law user", avatar: names.get(id)?.avatar ?? null, plan: friends ? names.get(id)?.plan : undefined };
  return <Conversation key={id} friendId={id} initial={messages} initialSeen={friends ? seen : null} other={other} />;
}
