import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { myStreak } from "@/lib/activity";
import { friendLists, people } from "@/lib/friends";
import { myGroups } from "@/lib/groups";
import { threads } from "@/lib/messages";
import { blockedBy } from "@/lib/moderation";
import { FriendsShell } from "./friends-shell";

export const metadata = { title: "Friends" };

/** Friends: friends and groups with their activity and conversations, beside the open conversation. */
export default async function FriendsLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect("/login");
  const id = s.user.id;
  const [lists, th, groups, streak, names, blocked] = await Promise.all([friendLists(id), threads(id), myGroups(id), myStreak(id), people([id]), blockedBy(id)]);
  const me = { id, name: names.get(id)?.name ?? s.user.name, avatar: names.get(id)?.avatar ?? null };
  return <FriendsShell me={me} initialLists={lists} initialThreads={th} initialGroups={groups} initialBlocked={blocked} streak={streak}>{children}</FriendsShell>;
}
