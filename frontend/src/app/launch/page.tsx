import type { Metadata } from "next";
import { LaunchForm } from "@/components/launch-form";

export const metadata: Metadata = {
  title: "Launch a kuota",
  description: "Set a price and a supply, preview the curve, and sign two transactions from your own wallet.",
};

export default function LaunchPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-4 pt-12 sm:px-6">
      <h1 className="text-5xl font-extrabold">Launch a kuota for your API.</h1>
      <p className="mt-3 max-w-prose text-lg">
        Set a price and a supply, preview the curve, then sign two transactions in your own wallet.
        Kuota never holds your keys.
      </p>
      <div className="mt-12">
        <LaunchForm />
      </div>
    </div>
  );
}
