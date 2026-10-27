import { Suspense } from "react";
import { Checkout } from "./checkout";

export const metadata = { title: "Checkout" };

export default function Page() {
  return (
    <Suspense>
      <Checkout />
    </Suspense>
  );
}
