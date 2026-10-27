import { redirect } from "next/navigation";

// Signed-out visitors land on the welcome screen; auth gating comes later.
export default function Root() {
  redirect("/welcome");
}
