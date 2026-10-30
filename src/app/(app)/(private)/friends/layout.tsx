import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { myStreak } from "@/lib/activity";
import { friendLists } from "@/lib/friends";
import { threads } from "@/lib/messages";
import { FriendsShell } from "./friends-shell";

export const metadata = { title: "Friends" };

/** Friends: the list of friends with their activity and conversations, beside the open conversation. */
export default async function FriendsLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect("/login");
  const [lists, th, streak] = await Promise.all([friendLists(s.user.id), threads(s.user.id), myStreak(s.user.id)]);
  return <FriendsShell initialLists={lists} initialThreads={th} streak={streak}>{children}</FriendsShell>;
}
