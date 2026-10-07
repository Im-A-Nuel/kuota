import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { EmptyState, SampleNotice } from "@/components/states";
import { listProviders } from "@/lib/api";
import { formatPercentFromBps, formatUsdc, hostOf, shortKey } from "@/lib/format";
import { reveal } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Providers",
  description: "Every kuota that is live, with the API endpoint it pays for.",
};

export default async function ProvidersPage() {
  const providers = await listProviders();
  const anySample = providers.some((p) => p.isSample);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-4 pt-12 sm:px-6">
      <h1 {...reveal(0)} className="text-5xl font-light">Providers</h1>
      <p {...reveal(100)} className="mt-3 max-w-prose text-lg">
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
            {providers.map((p, i) => (
              <li key={p.mint} {...reveal(150 + i * 80)} className="border-b border-line">
                <Link
                  href={`/k/${p.mint}`}
                  className="grid gap-x-6 gap-y-3 rounded-[18px] py-6 transition-colors hover:bg-card sm:grid-cols-12 sm:items-center sm:px-4"
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
                      <span className="text-teal">{formatPercentFromBps(p.discountBps)} cheaper</span>
                    </span>
                  </span>
                  <span className="sm:col-span-2">
                    <span className="block text-sm text-mute">Curve</span>
                    <span className="block font-semibold">
                      {p.status === "graduated"
                        ? "Graduated"
                        : `${Math.round(p.curveProgressBps / 100)}% filled`}
                    </span>
                    <span aria-hidden="true" className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-card">
                      <span
                        className="block h-full rounded-full bg-accent"
                        style={{ width: `${p.status === "graduated" ? 100 : p.curveProgressBps / 100}%` }}
                      />
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent sm:col-span-2 sm:justify-end">
                    Open token page
                    <ArrowRight />
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
