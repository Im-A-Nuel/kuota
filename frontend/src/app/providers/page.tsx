import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, SampleNotice } from "@/components/states";
import { listProviders } from "@/lib/api";
import { formatPercentFromBps, formatUsdc, hostOf, shortKey } from "@/lib/format";

export const metadata: Metadata = {
  title: "Providers",
  description: "Every kuota that is live, with the API endpoint it pays for.",
};

export default async function ProvidersPage() {
  const providers = await listProviders();
  const anySample = providers.some((p) => p.isSample);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-4 pt-12 sm:px-6">
      <h1 className="text-5xl font-light">Providers</h1>
      <p className="mt-3 max-w-prose text-lg">
        Every kuota that is live, with the API it pays for and where its curve stands.
      </p>

      {anySample && (
        <div className="mt-6">
          <SampleNotice what="The list shows one example entry." />
        </div>
      )}

      <div className="mt-8">
        {providers.length === 0 ? (
          <EmptyState
            title="No kuota is live yet."
            body="Providers appear here after they sign a launch. The first launch will show up the moment its transactions confirm."
            action={{ href: "/launch", label: "Launch a kuota for your API" }}
          />
        ) : (
          <ul className="border-t border-line">
            {providers.map((p) => (
              <li key={p.mint} className="border-b border-line">
                <Link
                  href={`/k/${p.mint}`}
                  className="grid gap-x-6 gap-y-2 py-5 hover:bg-card sm:grid-cols-12 sm:items-center sm:px-3"
                >
                  <span className="sm:col-span-5">
                    <span className="block text-2xl font-light">{p.name}</span>
                    <span className="block text-sm text-mute">
                      {p.symbol} on {hostOf(p.endpointUrl)}
                      {p.isSample ? " (sample)" : ` (${shortKey(p.mint)})`}
                    </span>
                  </span>
                  <span className="sm:col-span-3">
                    <span className="block text-sm text-mute">
                      Against {formatUsdc(p.usdcPrice)} USDC per call
                    </span>
                    <span className="block font-semibold">
                      {formatPercentFromBps(p.discountBps)} cheaper
                    </span>
                  </span>
                  <span className="sm:col-span-2">
                    <span className="block text-sm text-mute">Curve</span>
                    <span className="block font-semibold">
                      {p.status === "graduated"
                        ? "Graduated"
                        : `${Math.round(p.curveProgressBps / 100)}% filled`}
                    </span>
                  </span>
                  <span className="font-semibold underline underline-offset-4 sm:col-span-2 sm:text-right">
                    Open token page
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
