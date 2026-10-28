import { Suspense } from "react";
import { Plans } from "./plans";

export const metadata = { title: "Plans" };

export default function Page() {
  return (
    <Suspense>
      <Plans />
    </Suspense>
  );
}
