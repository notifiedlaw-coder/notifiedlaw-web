import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { filesFor } from "@/lib/files";
import { Files } from "./files";

export const metadata = { title: "My Files" };

export default async function Page() {
  const s = await getSession();
  if (!s) redirect("/login");
  return <Files initial={await filesFor(s.user.id)} />;
}
