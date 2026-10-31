import { redirect } from "next/navigation";
import AuthForm from "@/components/auth-form";
import { devAuthAddress, getSession, signedOutElsewhere } from "@/lib/auth";

export const metadata = { title: "Sign in", robots: { index: false, follow: true }, alternates: { canonical: "/login" } };

export default async function Login() {
  if (await getSession()) redirect("/dashboard");
  return <AuthForm mode="login" elsewhere={await signedOutElsewhere()} devAddress={await devAuthAddress("/login")} />;
}
