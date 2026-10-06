"use client";

import { ErrorState } from "@/components/states";

export default function KuotaError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <ErrorState
        title="This kuota did not load."
        body={`${error.message || "The backend did not answer."} The token page reads from the stats API, so check that it is reachable.`}
        onRetry={reset}
      />
    </div>
  );
}
