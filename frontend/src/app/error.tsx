"use client";

import Link from "next/link";
import { ErrorState } from "@/components/states";

export default function RootError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pt-12 sm:px-6">
      <ErrorState
        title="This page hit an error."
        body={`${error.message || "Something failed while rendering."} Try again, or go to the provider list.`}
        onRetry={reset}
      />
      <Link href="/providers" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
        Go to providers
      </Link>
    </div>
  );
}
