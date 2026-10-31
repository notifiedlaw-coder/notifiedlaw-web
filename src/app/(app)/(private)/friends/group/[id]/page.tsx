import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { groupDetail, groupMessages, membership } from "@/lib/groups";
import { GroupConversation } from "../../group-conversation";

/** A group conversation. Opening it marks the group read. */
export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, s] = await Promise.all([params, getSession()]);
  if (!s) redirect("/login");
  if (!(await membership(s.user.id, id))) redirect("/friends");
  const [detail, messages] = await Promise.all([groupDetail(id), groupMessages(s.user.id, id)]);
  if (!detail) redirect("/friends");
  return <GroupConversation key={id} initialGroup={detail} initial={messages} />;
}
