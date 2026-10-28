import { redirect } from "next/navigation";
import AuthForm from "@/components/auth-form";
import { getSession } from "@/lib/auth";

export const metadata = { title: "Sign in" };

export default async function Login() {
  if (await getSession()) redirect("/dashboard");
  return <AuthForm mode="login" />;
}
