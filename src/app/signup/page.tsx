import { redirect } from "next/navigation";
import AuthForm from "@/components/auth-form";
import { getSession } from "@/lib/auth";

export const metadata = { title: "Create account" };

export default async function Signup() {
  if (await getSession()) redirect("/dashboard");
  return <AuthForm mode="signup" />;
}
