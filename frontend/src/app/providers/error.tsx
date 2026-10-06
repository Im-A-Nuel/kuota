"use client";

import { ErrorState } from "@/components/states";

export default function ProvidersError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <h1 className="text-5xl font-extrabold">Providers</h1>
      <div className="mt-8">
        <ErrorState
          title="The provider list did not load."
          body={`${error.message || "The backend did not answer."} Check that the API is reachable, then try again.`}
          onRetry={reset}
        />
      </div>
    </div>
  );
}
