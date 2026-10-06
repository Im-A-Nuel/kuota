import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BuyPanel } from "@/components/buy-panel";
import { CurveChart } from "@/components/curve-chart";
import { EmptyState, SampleNotice } from "@/components/states";
import { Voucher } from "@/components/voucher";
import { getBurns, getKuota, getSettlements } from "@/lib/api";
import { estimateCurve } from "@/lib/curve";
import {
  explorerTx,
  formatCount,
  formatPercentFromBps,
  formatUsdc,
  hostOf,
  shortKey,
  wholeUnits,
} from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/k/[mint]">): Promise<Metadata> {
  const { mint } = await params;
  const kuota = await getKuota(mint);
  return kuota
    ? { title: `${kuota.symbol}`, description: `${kuota.name}: 1 kuota pays for 1 call.` }
    : { title: "Kuota not found" };
}

function TxLink({ signature }: { signature: string | null }) {
  if (!signature) return <span className="text-sm text-mute">sample, no transaction</span>;
  return (
    <a
      href={explorerTx(signature)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
    >
      {shortKey(signature, 6, 6)}
    </a>
  );
}

export default async function KuotaPage({ params }: PageProps<"/k/[mint]">) {
  const { mint } = await params;
  const kuota = await getKuota(mint);
  if (!kuota) notFound();

  const [burns, settlements] = await Promise.all([getBurns(mint), getSettlements(mint)]);

  const simulation = estimateCurve({
    usdcPricePerCall: kuota.usdcPrice,
    committedCalls: kuota.committedCalls,
    migrationThresholdUsdc: 750,
    migrationFeeBps: 3000,
  });
  const soldNow = Math.round(simulation.callsSoldAtThreshold * (kuota.curveProgressBps / 10000));

  const specs: [string, string][] = [
    ["Price now", `${formatUsdc(kuota.priceKuotaUsdc)} USDC`],
    ["USDC price of a call", `${formatUsdc(kuota.usdcPrice)} USDC`],
    ["Discount", formatPercentFromBps(kuota.discountBps)],
    ["Committed supply", `${formatCount(kuota.committedCalls)} kuota`],
    ["Holders", formatCount(kuota.holders)],
    ["Burned", `${formatCount(wholeUnits(kuota.burned))} kuota`],
    ["Calls paid with kuota", formatCount(kuota.callsPaid)],
    ["Endpoint", hostOf(kuota.endpointUrl)],
  ];

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-10 gap-y-12 px-4 pb-4 pt-10 sm:px-6 lg:grid-cols-12">
      <div className="space-y-3 lg:col-span-8">
        {kuota.isSample && <SampleNotice what="Figures come from the worked example in the docs." />}
        <Voucher
          data={{
            name: kuota.name,
            symbol: kuota.symbol,
            mint: kuota.isSample ? null : kuota.mint,
            status: kuota.status,
            priceKuotaUsdc: kuota.priceKuotaUsdc,
            usdcPrice: kuota.usdcPrice,
            discountBps: kuota.discountBps,
            curveProgressBps: kuota.curveProgressBps,
            endpointUrl: kuota.endpointUrl,
            isSample: kuota.isSample,
          }}
        />
      </div>

      <aside className="lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1">
        <div className="lg:sticky lg:top-6">
          <BuyPanel
            symbol={kuota.symbol}
            priceKuotaUsdc={kuota.priceKuotaUsdc}
            usdcPrice={kuota.usdcPrice}
            endpointHost={hostOf(kuota.endpointUrl)}
            graduated={kuota.status === "graduated"}
          />
        </div>
      </aside>

      <div className="space-y-16 lg:col-span-8">
        <section aria-labelledby="specs">
          <h2 id="specs" className="text-3xl font-extrabold">
            The numbers
          </h2>
          <dl className="mt-4 grid border-t-[1.5px] border-ink sm:grid-cols-2 sm:gap-x-10">
            {specs.map(([term, value]) => (
              <div key={term} className="flex justify-between gap-4 border-b border-rule py-3">
                <dt className="text-mute">{term}</dt>
                <dd className="text-right font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {kuota.status === "curve" && (
          <section aria-labelledby="curve">
            <h2 id="curve" className="mb-4 text-3xl font-extrabold">
              Where the curve stands
            </h2>
            <CurveChart
              title="Price per call against calls sold (estimate)"
              points={simulation.curve}
              usdcPrice={Number(kuota.usdcPrice)}
              soldNow={soldNow}
            />
          </section>
        )}

        <section aria-labelledby="burns">
          <h2 id="burns" className="text-3xl font-extrabold">
            Burn ledger
          </h2>
          <p className="mt-2 max-w-prose text-mute">
            The provider&apos;s received kuota is burned every 10 minutes. Burned supply equals
            calls served.
          </p>
          <div className="mt-4">
            {burns.items.length === 0 ? (
              <EmptyState
                title="Nothing burned yet."
                body="The first row appears after the provider receives kuota and the burn worker runs. That takes at most 10 minutes after the first paid call."
              />
            ) : (
              <ul className="divide-y divide-rule border-y-[1.5px] border-ink">
                {burns.items.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                    <span className="font-display text-2xl font-bold">
                      {formatCount(wholeUnits(b.amount))} kuota
                    </span>
                    <TxLink signature={b.signature} />
                    <span className="stamp">Redeemed</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section aria-labelledby="settlements">
          <h2 id="settlements" className="text-3xl font-extrabold">
            Recent payments
          </h2>
          <div className="mt-4">
            {settlements.items.length === 0 ? (
              <EmptyState
                title="No calls paid yet."
                body="Payments show up here once an agent pays this endpoint with kuota or USDC."
              />
            ) : (
              <ul className="divide-y divide-rule border-y-[1.5px] border-ink">
                {settlements.items.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                    <span className="font-semibold">
                      {s.asset === "kuota"
                        ? `${formatCount(wholeUnits(s.amount))} kuota`
                        : `${formatUsdc(Number(s.amount) / 1_000_000)} USDC`}
                    </span>
                    <span className="text-sm text-mute">
                      {s.payer ? shortKey(s.payer) : "sample wallet"}
                      {s.isTeam && ", team wallet"}
                    </span>
                    <TxLink signature={s.signature} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="mt-3 text-sm text-mute">
            Team wallets are labelled so traction counts can exclude them.
          </p>
        </section>
      </div>
    </div>
  );
}
