import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BuyPanel } from "@/components/buy-panel";
import { CopyButton } from "@/components/copy-button";
import { CurveChart } from "@/components/curve-chart";
import { BurnLedger, PaymentList } from "@/components/ledgers";
import { ProviderSetup } from "@/components/provider-setup";
import { SampleNotice } from "@/components/states";
import { Voucher } from "@/components/voucher";
import { getBurns, getKuota, getSettlements } from "@/lib/api";
import { estimateCurve } from "@/lib/curve";
import {
  explorerAccount,
  formatCount,
  formatPercentFromBps,
  formatUsdc,
  hostOf,
  jupiterSwap,
  wholeUnits,
} from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/k/[mint]">): Promise<Metadata> {
  const { mint } = await params;
  const kuota = await getKuota(mint);
  return kuota
    ? {
        title: `${kuota.symbol}, ${kuota.name}`,
        description: `1 ${kuota.symbol} pays for 1 call on ${hostOf(kuota.endpointUrl)}. Now ${formatPercentFromBps(kuota.discountBps)} below the USDC price.`,
      }
    : { title: "Kuota not found" };
}

const outlineLink =
  "inline-flex min-h-11 items-center rounded-control border-[1.5px] border-ink px-3 text-sm font-semibold hover:bg-ink hover:text-paper";

export default async function KuotaPage({ params }: PageProps<"/k/[mint]">) {
  const { mint } = await params;
  const kuota = await getKuota(mint);
  if (!kuota) notFound();

  const [burns, settlements] = await Promise.all([getBurns(mint), getSettlements(mint)]);
  const graduated = kuota.status === "graduated";

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
  ];

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-10 gap-y-12 px-4 pb-4 pt-10 sm:px-6 lg:grid-cols-12">
      <div className="space-y-3 lg:col-span-8">
        {kuota.isSample && <SampleNotice what="Figures follow the worked example in the docs." />}
        <Voucher data={kuota} />

        {/* Identifiers agents and providers need to copy into their config. */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {kuota.isSample ? (
            <p className="text-sm text-mute">
              A real kuota shows its mint here, with copy and explorer links.
            </p>
          ) : (
            <>
              <CopyButton text={kuota.mint} label="Copy mint address" />
              <a href={explorerAccount(kuota.mint)} target="_blank" rel="noreferrer" className={outlineLink}>
                Mint on Solscan
              </a>
              <a href={kuota.endpointUrl} target="_blank" rel="noreferrer" className={outlineLink}>
                Endpoint: {hostOf(kuota.endpointUrl)}
              </a>
            </>
          )}
        </div>
      </div>

      <aside className="lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1">
        <div className="lg:sticky lg:top-6">
          <BuyPanel
            symbol={kuota.symbol}
            priceKuotaUsdc={kuota.priceKuotaUsdc}
            usdcPrice={kuota.usdcPrice}
            endpointHost={hostOf(kuota.endpointUrl)}
            graduated={graduated}
          />
        </div>
      </aside>

      <div className="min-w-0 space-y-16 lg:col-span-8">
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

        {graduated ? (
          <section aria-labelledby="market">
            <h2 id="market" className="text-3xl font-extrabold">
              Trading on DAMM v2
            </h2>
            <p className="mt-2 max-w-prose">
              The curve filled and the pool moved to Meteora DAMM v2, with its liquidity locked
              permanently. The price is now set by the pool. If kuota ever costs more than a call
              in USDC, agents simply pay USDC, so there is no reason to pay above that.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={jupiterSwap(kuota.mint)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center rounded-control bg-accent px-4 font-bold text-accent-ink hover:brightness-95"
              >
                Swap on Jupiter
              </a>
              {kuota.dammPool && (
                <a href={explorerAccount(kuota.dammPool)} target="_blank" rel="noreferrer" className={outlineLink}>
                  DAMM v2 pool on Solscan
                </a>
              )}
            </div>
          </section>
        ) : (
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
            <BurnLedger mint={mint} initial={burns} />
          </div>
        </section>

        <section aria-labelledby="settlements">
          <h2 id="settlements" className="text-3xl font-extrabold">
            Recent payments
          </h2>
          <div className="mt-4">
            <PaymentList mint={mint} initial={settlements} />
          </div>
          <p className="mt-3 text-sm text-mute">
            Team wallets are labelled so traction counts can exclude them.
          </p>
        </section>

        <details className="group rounded-panel border-[1.5px] border-ink bg-card">
          <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 px-5 py-3 font-display text-xl font-bold">
            Running this endpoint? Set it up to accept kuota
            <span aria-hidden="true" className="text-2xl leading-none group-open:rotate-45">+</span>
          </summary>
          <div className="border-t border-rule p-5">
            <ProviderSetup
              mint={kuota.isSample ? null : kuota.mint}
              usdcPrice={kuota.usdcPrice}
              headingLevel={3}
            />
          </div>
        </details>
      </div>
    </div>
  );
}
