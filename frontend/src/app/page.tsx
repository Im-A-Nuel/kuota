import Link from "next/link";
import { CurveChart } from "@/components/curve-chart";
import { SampleNotice } from "@/components/states";
import { Voucher } from "@/components/voucher";
import { usingSampleData } from "@/lib/api";
import { estimateCurve } from "@/lib/curve";
import { wholeUnits } from "@/lib/format";
import { mockGetBurns, mockGetKuota, SAMPLE_MINT } from "@/lib/mock-data";

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const primaryCta =
  "inline-flex min-h-12 items-center rounded-control bg-accent px-5 font-bold text-accent-ink hover:brightness-95";
const secondaryCta =
  "inline-flex min-h-12 items-center rounded-control border-[1.5px] border-ink px-5 font-bold hover:bg-ink hover:text-paper";

export default function HomePage() {
  const sample = mockGetKuota(SAMPLE_MINT)!;
  const burns = mockGetBurns(SAMPLE_MINT).items;
  const simulation = estimateCurve({
    usdcPricePerCall: sample.usdcPrice,
    committedCalls: sample.committedCalls,
    migrationThresholdUsdc: 750,
    migrationFeeBps: 3000,
  });
  const soldNow = Math.round(simulation.callsSoldAtThreshold * (sample.curveProgressBps / 10000));

  return (
    <>
      {/* Hero: copy left, the product itself (a voucher) right. */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 pb-4 pt-12 sm:px-6 lg:grid-cols-12 lg:items-center lg:pt-20">
        <div className="lg:col-span-5">
          <h1 className="text-5xl font-extrabold sm:text-6xl">
            Buy API calls before you need them.
          </h1>
          <p className="mt-5 max-w-prose text-lg">
            One kuota is one call on an x402 API. Providers sell capacity up front on a bonding
            curve. Agents pay with kuota when it costs less than USDC, and every spent kuota is
            burned.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/providers" className={primaryCta}>
              Browse live kuota
            </Link>
            <Link href="/launch" className={secondaryCta}>
              Launch a kuota for your API
            </Link>
          </div>
        </div>
        <div className="lg:col-span-7">
          <Voucher
            data={{
              name: sample.name,
              symbol: sample.symbol,
              mint: null,
              status: sample.status,
              priceKuotaUsdc: sample.priceKuotaUsdc,
              usdcPrice: sample.usdcPrice,
              discountBps: sample.discountBps,
              curveProgressBps: sample.curveProgressBps,
              endpointUrl: sample.endpointUrl,
              isSample: true,
            }}
          />
          <div className="mt-3 space-y-2">
            <SampleNotice what="This voucher uses the worked example from the project docs." />
            {usingSampleData && (
              <Link
                href={`/k/${SAMPLE_MINT}`}
                className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
              >
                Open the full sample token page
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Payment: narrow explanation left, wide literal 402 response right. */}
      <section className="mx-auto mt-24 grid max-w-6xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 className="text-4xl font-extrabold">One endpoint, two ways to pay.</h2>
          <p className="mt-4">
            A provider&apos;s API answers with 402 and lists two prices: the USDC price, or one
            kuota. The agent client picks the cheaper option on every call and never pays more than
            the USDC one.
          </p>
          <p className="mt-4 text-sm text-mute">
            Design preview. The middleware and the client are not released yet. Field names follow
            x402 V2 and are checked against the installed SDK before release.
          </p>
        </div>
        <div className="lg:col-span-8">
          <pre
            tabIndex={0}
            aria-label="Example 402 response body"
            className="overflow-x-auto rounded-panel border-[1.5px] border-ink bg-card p-5 text-sm leading-relaxed"
            style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}
          >
            {`HTTP/1.1 402 Payment Required

{
  "x402Version": 2,
  "accepts": [
    { "scheme": "exact",
      "asset": "${USDC_MINT}",
      "amount": "10000" },
    { "scheme": "exact",
      "asset": "<KUOTA_MINT>",
      "amount": "1000000" }
  ]
}`}
          </pre>
          <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-bold">amount 10000</dt>
              <dd className="text-mute">0.01 USDC, because USDC has 6 decimals.</dd>
            </div>
            <div>
              <dt className="font-bold">amount 1000000</dt>
              <dd className="text-mute">1 kuota, which is exactly one call.</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Price path: full-bleed teal band, chart on a card so its text keeps contrast. */}
      <section className="mt-24 bg-teal text-paper">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <h2 className="text-4xl font-extrabold sm:text-5xl">
              The curve starts at half price and stops at 85%.
            </h2>
            <dl className="mt-8 space-y-4">
              <div className="border-t border-paper/40 pt-3">
                <dt className="font-bold">Fixed supply</dt>
                <dd>Equal to the calls the provider commits to serve. No new tokens, ever.</dd>
              </div>
              <div className="border-t border-paper/40 pt-3">
                <dt className="font-bold">Always below redemption</dt>
                <dd>
                  The last price on the curve is 15% under the USDC price of a call, so the curve
                  cannot price a kuota above what it redeems for.
                </dd>
              </div>
              <div className="border-t border-paper/40 pt-3">
                <dt className="font-bold">After graduation</dt>
                <dd>
                  The pool moves to DAMM v2. If kuota ever costs more than USDC, agents simply pay
                  USDC.
                </dd>
              </div>
            </dl>
          </div>
          <div className="rounded-panel border-[1.5px] border-ink bg-card p-5 text-ink lg:col-span-7">
            <CurveChart
              title="Price per call on the curve, for a 0.01 USDC call and a 750 USDC threshold (estimate)"
              points={simulation.curve}
              usdcPrice={Number(sample.usdcPrice)}
              soldNow={soldNow}
            />
          </div>
        </div>
      </section>

      {/* Burn ledger: stamps on the left, the accounting identity on the right. */}
      <section className="mx-auto mt-24 grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h2 className="text-4xl font-extrabold">Spent kuota is burned, in public.</h2>
          <p className="mt-4 max-w-prose">
            The provider&apos;s balance is burned every 10 minutes through an SPL delegate, so
            burned supply always equals calls served. Every burn gets a row in the ledger.
          </p>
          <ul className="mt-6 divide-y divide-rule border-y-[1.5px] border-ink">
            {burns.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-4 py-3">
                <span className="font-display text-2xl font-bold">
                  {wholeUnits(b.amount)} kuota
                </span>
                <span className="text-sm text-mute">sample, no transaction</span>
                <span className="stamp">Redeemed</span>
              </li>
            ))}
          </ul>
        </div>
        <aside className="lg:col-span-5 lg:pt-16">
          <p className="text-sm font-semibold text-mute">The accounting identity</p>
          <p className="mt-2 rounded-panel border-[1.5px] border-ink bg-card p-5 font-display text-2xl font-bold leading-snug">
            circulating = supply - burned - balance in curve or pool
          </p>
          <p className="mt-3 text-sm text-mute">
            This is the rule the ledger has to satisfy at every snapshot, so anyone can re-check
            the numbers with a query.
          </p>
        </aside>
      </section>

      {/* Providers: terms at launch, as a plain ruled list. */}
      <section className="mx-auto mt-24 grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 className="text-4xl font-extrabold">
            Launching takes one form and two signatures.
          </h2>
          <p className="mt-4 max-w-prose">
            You sign <code>createConfig</code> and <code>createPoolWithFirstBuy</code> in your own
            wallet. Kuota builds the transactions and never holds your keys. Your endpoint then
            adds one entry to <code>accepts</code>.
          </p>
          <Link href="/launch" className={`${primaryCta} mt-8`}>
            Launch a kuota for your API
          </Link>
        </div>
        <div className="lg:col-span-7">
          <p className="text-sm font-semibold text-mute">Terms at launch</p>
          <dl className="mt-2 border-t-[1.5px] border-ink">
            {[
              ["Creator share of trading fees", "50% from the first minute"],
              ["Migration fee at graduation", "30%, paid to the provider"],
              ["Liquidity after graduation", "Locked permanently, fees still claimable"],
              ["Leftover tokens", "Return to the provider wallet"],
              ["Kuota’s cut", "Kuota is the DBC partner and earns a share of trading fees"],
            ].map(([term, value]) => (
              <div
                key={term}
                className="grid gap-1 border-b border-rule py-3 sm:grid-cols-5 sm:gap-4"
              >
                <dt className="font-bold sm:col-span-2">{term}</dt>
                <dd className="sm:col-span-3">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
