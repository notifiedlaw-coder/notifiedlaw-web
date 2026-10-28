import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Onboarding } from "./onboarding";

export const metadata = { title: "Welcome" };

export default async function Page() {
  if (!(await getSession())) redirect("/login");
  return <Onboarding />;
}
