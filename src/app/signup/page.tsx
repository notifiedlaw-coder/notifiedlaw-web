import { redirect } from "next/navigation";
import AuthForm from "@/components/auth-form";
import { getSession } from "@/lib/auth";

export const metadata = {
  title: "Create account",
  description: "Join NotifiedLaw free and start studying Ghanaian law. Law students with a university email get a 7-day Supreme Justice trial.",
  alternates: { canonical: "/signup" },
};

export default async function Signup() {
  if (await getSession()) redirect("/dashboard");
  return <AuthForm mode="signup" />;
}
