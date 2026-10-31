import { redirect } from "next/navigation";
import AuthForm from "@/components/auth-form";
import { devAuthAddress, getSession } from "@/lib/auth";

export const metadata = {
  title: "Create account",
  description: "Join NotifiedLaw and start studying Ghanaian law. Students verify with their university email; professionals sign up with Google.",
  alternates: { canonical: "/signup" },
};

export default async function Signup() {
  if (await getSession()) redirect("/dashboard");
  return <AuthForm mode="signup" devAddress={await devAuthAddress("/signup")} />;
}
