import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { CurveChart } from "@/components/curve-chart";
import { HeroLoop } from "@/components/hero-loop";
import { ArrowBadge, ArrowRight } from "@/components/icons";
import { usingSampleData } from "@/lib/api";
import { CLUSTER_LABEL } from "@/lib/config";
import { estimateCurve } from "@/lib/curve";
import { formatUsdc, wholeUnits } from "@/lib/format";
import { mockGetBurns, mockGetKuota, SAMPLE_MINT } from "@/lib/mock-data";
import { btnOnBrand, btnOnBrandOutline, btnPrimary, btnSecondary, chip, reveal, sectionX } from "@/lib/ui";

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const RESPONSE_402 = `HTTP/1.1 402 Payment Required

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
}`;

const AGENT_SNIPPET = `import { createKuotaFetch } from "kuota-fetch";

const kuotaFetch = createKuotaFetch({
  signer,              // your agent's Keypair
  connection,          // a Solana Connection
  budgetUsdcPerHour: 2,
});

// Same call as fetch. Payment is handled on the 402.
const res = await kuotaFetch("https://api.example/v1/resource");`;

const STACK = ["Solana", "Meteora DBC", "DAMM v2", "x402", "Jupiter"];

// Protocol facts, not traction. Each one comes from docs/ARCHITECTURE.md or docs/SCHEMA.md.
const FACTS = [
  { value: "1:1", label: "One kuota pays for one call. Supply equals the calls a provider commits." },
  { value: "50 to 85%", label: "Of the USDC price while the curve runs. Never above it." },
  { value: "10 min", label: "Between burns. Burned supply always equals calls served." },
];

const RULES: [string, string][] = [
  ["Pay with kuota", "You hold at least 1 and it costs no more than the USDC price."],
  ["Buy a batch, then pay with kuota", "You hold none, a batch of 100 is cheaper after slippage, and it fits the hourly budget."],
  ["Pay with USDC", "Every other case. The client never pays more than the USDC price for one call."],
];

// Icons are drawn for their item: a stack of supply, a fork between two prices, a ledger.
function SupplyIcon() {
  return (
    <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
      <ellipse cx="24" cy="34" rx="15" ry="5" fill="none" stroke="var(--accent)" strokeWidth="2" />
      <ellipse cx="24" cy="26" rx="15" ry="5" fill="none" stroke="var(--accent)" strokeWidth="2" />
      <ellipse cx="24" cy="18" rx="15" ry="5" fill="var(--accent)" />
    </svg>
  );
}

function ForkIcon() {
  return (
    <svg viewBox="0 0 48 48" width="44" height="44" fill="none" aria-hidden="true">
      <path d="M8 24h12c6 0 8-10 14-10h6" stroke="var(--line-strong)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 24c6 0 8 10 14 10h6" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="8" cy="24" r="4" fill="var(--accent)" />
      <circle cx="40" cy="34" r="4" fill="var(--accent)" />
    </svg>
  );
}

function LedgerIcon() {
  return (
    <svg viewBox="0 0 48 48" width="44" height="44" fill="none" aria-hidden="true">
      <rect x="9" y="7" width="30" height="34" rx="6" stroke="var(--accent)" strokeWidth="2" />
      <path d="M16 17h16M16 24h16M16 31h9" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const linkArrow = "mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent hover:underline";

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
  const ledgerHref = usingSampleData ? `/k/${SAMPLE_MINT}` : "/providers";
  const ledgerLabel = usingSampleData ? "Open the sample ledger" : "Open a live ledger";

  return (
    <>
      {/* Hero */}
      <section className={`${sectionX} pt-14 sm:pt-20`}>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
          <h1 {...reveal(0)} className="text-5xl font-light sm:text-6xl lg:col-span-7 lg:text-7xl">
            Turn API capacity into{" "}
            <span className="bg-gradient-to-r from-accent to-teal bg-clip-text text-transparent">
              prepaid calls
            </span>
          </h1>
          <div {...reveal(150)} className="lg:col-span-5 lg:pt-3">
            <p className={`${chip} text-mute`}>
              <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
              {CLUSTER_LABEL} preview for x402 APIs on Solana
            </p>
            <p className="mt-4 text-lg text-mute">
              One kuota is one call on an x402 API. Providers sell capacity up front on a bonding
              curve, agents pay with kuota when it costs less than USDC, and every spent kuota is{" "}
              <span className="font-semibold text-accent">burned</span>.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/providers" className={btnPrimary}>
                {usingSampleData ? "Browse kuota" : "Browse live kuota"}
                <ArrowBadge />
              </Link>
              <Link href="/launch" className={btnSecondary}>
                Launch a kuota
              </Link>
            </div>
          </div>
        </div>

        <div {...reveal(250, "scale")} className="relative mt-8 md:mt-4">
          <div className="mx-auto max-w-3xl">
            <HeroLoop />
          </div>
          <div className="mt-2 flex justify-between gap-4 text-2xl font-light md:absolute md:inset-0 md:mt-0 md:block md:text-3xl">
            <p className="text-teal md:absolute md:left-0 md:top-[44%]">Up to 50% off</p>
            <p className="text-right text-accent md:absolute md:right-0 md:top-[66%]">1 kuota = 1 call</p>
          </div>
        </div>

        <div {...reveal(0)} className="mt-10 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-line pt-6">
          <p className="text-sm text-mute">Built on</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm font-semibold">
            {STACK.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Facts band */}
      <section className={`${sectionX} mt-16`} aria-label="How kuota is set up">
        <div {...reveal(0)} className="brand-band grid grid-cols-1 gap-8 rounded-panel p-4 sm:p-6 lg:grid-cols-4 lg:items-center">
          <svg viewBox="0 0 1200 300" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
            <path d="M0 220 C300 120 500 320 800 180 S1100 60 1200 120" fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="60" />
            <path d="M0 120 C260 40 520 260 820 110 S1120 0 1200 40" fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="90" />
          </svg>
          <div className="rounded-[18px] bg-[#0b1452]/80 p-6">
            <p className="text-4xl font-light">x402 + DBC</p>
            <p className="mt-2 font-semibold">Prepaid capacity for API calls</p>
            <p className="mt-3 text-sm text-white/85">
              Kuota tokenises calls on Meteora DBC and settles them through x402. No custom
              on-chain program, no keys held.
            </p>
          </div>
          {FACTS.map((f, i) => (
            <div key={f.value} {...reveal(150 + i * 120)} className="px-2 lg:px-4">
              <p className="whitespace-nowrap text-4xl font-light xl:text-5xl">{f.value}</p>
              <p className="mt-3 text-sm text-white/90">{f.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities: each item carries a small piece of evidence, not just a paragraph. */}
      <section className={`${sectionX} mt-24 grid grid-cols-1 gap-12 lg:grid-cols-12`}>
        <div {...reveal(0)} className="lg:col-span-5">
          <h2 className="text-5xl font-light">What kuota does</h2>
          <p className="mt-5 max-w-md text-mute">
            One token, three jobs: it funds providers early, lowers what agents pay per call, and
            leaves a public record of every call served.
          </p>
        </div>
        <ul className="lg:col-span-7">
          <li {...reveal(0)} className="grid grid-cols-[3.5rem_1fr] gap-6 border-b border-line pb-8">
            <div className="pt-1"><SupplyIcon /></div>
            <div className="min-w-0 border-l border-line pl-6">
              <h3 className="text-2xl font-normal">Pre-sell capacity</h3>
              <p className="mt-3 text-mute">
                Providers turn the calls they can serve into a fixed-supply token. Buyers get a
                discount, the provider gets fees from the first minute.
              </p>
              <dl className="mt-4 flex flex-wrap gap-2 text-sm">
                {[["Creator fee share", "50%"], ["Migration fee", "30% to you"], ["LP after graduation", "Locked"]].map(([t, v]) => (
                  <div key={t} className="rounded-full bg-card px-3 py-1">
                    <dt className="inline text-mute">{t} </dt>
                    <dd className="inline font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              <Link href="/launch" className={linkArrow}>
                See the launch flow
                <ArrowRight />
              </Link>
            </div>
          </li>

          <li {...reveal(120)} className="grid grid-cols-[3.5rem_1fr] gap-6 border-b border-line py-8">
            <div className="pt-1"><ForkIcon /></div>
            <div className="min-w-0 border-l border-line pl-6">
              <h3 className="text-2xl font-normal">Pay the cheaper price</h3>
              <p className="mt-3 text-mute">
                On every 402 the agent client compares one kuota with the USDC price and pays
                whichever costs less, inside an hourly budget.
              </p>
              <div className="mt-4 grid max-w-sm grid-cols-2 overflow-hidden rounded-[14px] border border-line text-sm">
                <div className="p-3">
                  <p className="text-mute">USDC price</p>
                  <p className="text-lg"><s className="text-mute">{formatUsdc(sample.usdcPrice, 4)}</s></p>
                </div>
                <div className="bg-accent-wash p-3">
                  <p className="text-mute">1 kuota, sample</p>
                  <p className="text-lg font-semibold text-accent">{formatUsdc(sample.priceKuotaUsdc, 4)}</p>
                </div>
              </div>
              <Link href="#agents" className={linkArrow}>
                See the agent client
                <ArrowRight />
              </Link>
            </div>
          </li>

          <li {...reveal(240)} className="grid grid-cols-[3.5rem_1fr] gap-6 py-8">
            <div className="pt-1"><LedgerIcon /></div>
            <div className="min-w-0 border-l border-line pl-6">
              <h3 className="text-2xl font-normal">Burned in public</h3>
              <p className="mt-3 text-mute">
                Every kuota spent on a call is burned within 10 minutes, and every burn gets a row
                anyone can re-check.
              </p>
              <p className="mt-4 inline-flex items-center gap-3 rounded-full bg-card py-1 pl-4 pr-1 text-sm">
                <span>{wholeUnits(burns[0].amount)} kuota, sample</span>
                <span className="rounded-full bg-teal-wash px-3 py-1 text-xs font-semibold text-teal">Burned</span>
              </p>
              <div>
                <Link href={ledgerHref} className={linkArrow}>
                  {ledgerLabel}
                  <ArrowRight />
                </Link>
              </div>
            </div>
          </li>
        </ul>
      </section>

      {/* Payment: centred heading, both sides of the exchange next to each other, rules below. */}
      <section id="agents" className={`${sectionX} mt-24 scroll-mt-8`}>
        <div {...reveal(0)} className="mx-auto max-w-3xl text-center">
          <h2 className="text-5xl font-light">
            One endpoint, <span className="text-accent">two ways to pay</span>
          </h2>
          <p className="mt-5 text-mute">
            The provider&apos;s API answers 402 with two prices. Agents swap{" "}
            <code className="font-semibold text-ink">fetch</code> for{" "}
            <code className="font-semibold text-ink">kuotaFetch</code> and the client picks.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div {...reveal(100)} className="min-w-0">
            <p className="mb-2 text-sm font-semibold">The provider answers</p>
            <CodeBlock label="Example 402 response body" code={RESPONSE_402} />
          </div>
          <div {...reveal(200)} className="min-w-0">
            <p className="mb-2 text-sm font-semibold">The agent calls</p>
            <CodeBlock label="kuotaFetch example" code={AGENT_SNIPPET} />
          </div>
        </div>
        <ol className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {RULES.map(([term, value], i) => (
            <li key={term} {...reveal(i * 100)} className="rounded-[18px] border border-line p-5">
              <span className="flex size-8 items-center justify-center rounded-full bg-accent-wash text-sm font-semibold text-accent">
                {i + 1}
              </span>
              <p className="mt-3 font-semibold">{term}</p>
              <p className="mt-1 text-sm text-mute">{value}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-center text-sm text-mute">
          Design preview. The middleware and the client are not released yet.
        </p>
      </section>

      {/* Price path */}
      <section className={`${sectionX} mt-24`}>
        <div {...reveal(0)} className="grid grid-cols-1 gap-10 rounded-panel bg-card p-6 sm:p-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <h2 className="text-4xl font-light sm:text-5xl">
              Starts at half price, <span className="text-teal">stops at 85%</span>
            </h2>
            <dl className="mt-8 space-y-5">
              {[
                ["Fixed supply", "Equal to the calls the provider commits to serve. No new tokens, ever."],
                ["Always below redemption", "The last price on the curve is 15% under the USDC price of a call."],
                ["After graduation", "The pool moves to DAMM v2. If kuota ever costs more than USDC, agents simply pay USDC."],
              ].map(([t, d]) => (
                <div key={t} className="border-t border-line pt-4">
                  <dt className="font-semibold">{t}</dt>
                  <dd className="mt-1 text-mute">{d}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="min-w-0 rounded-[18px] bg-paper p-5 lg:col-span-7">
            <CurveChart
              title="Price per call on the curve, for a 0.01 USDC call and a 750 USDC threshold (estimate)"
              points={simulation.curve}
              usdcPrice={Number(sample.usdcPrice)}
              soldNow={soldNow}
            />
          </div>
        </div>
      </section>

      {/* Ledger: the rule on the left, the rows on the right, aligned to the bottom. */}
      <section className={`${sectionX} mt-24 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-end`}>
        <div {...reveal(0)} className="lg:col-span-5">
          <h2 className="text-5xl font-light">Spent kuota is burned, in public</h2>
          <p className="mt-5 text-mute">
            The provider&apos;s balance is burned every 10 minutes through an SPL delegate, so
            burned supply always equals calls served. The ledger has to satisfy one rule at every
            snapshot:
          </p>
          <p className="mt-6 rounded-panel bg-card p-6 text-2xl font-light leading-snug">
            circulating = supply &minus; burned &minus; balance in curve or pool
          </p>
        </div>
        <div {...reveal(150)} className="lg:col-span-7">
          <ul className="border-t border-line">
            {burns.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-4 border-b border-line py-4">
                <span className="text-2xl font-light">{wholeUnits(b.amount)} kuota</span>
                <span className="flex items-center gap-3">
                  <span className="text-sm text-mute">sample</span>
                  <span className="rounded-full bg-teal-wash px-3 py-1 text-xs font-semibold text-teal">Burned</span>
                </span>
              </li>
            ))}
          </ul>
          <Link href={ledgerHref} className={linkArrow}>
            {ledgerLabel}
            <ArrowRight />
          </Link>
        </div>
      </section>

      {/* Closing band */}
      <section className={`${sectionX} mt-24`}>
        <div {...reveal(0, "scale")} className="brand-band grid grid-cols-1 gap-10 rounded-panel p-8 sm:p-12 lg:grid-cols-2">
          <h2 className="text-4xl font-light sm:text-5xl">
            No idle credits.
            <br />
            No retail prices.
          </h2>
          <div>
            <p className="text-2xl font-light">Launch in one form, two signatures</p>
            <p className="mt-3 text-white/90">
              Set a price and a supply, then sign <code>createConfig</code> and{" "}
              <code>createPoolWithFirstBuy</code> in your own wallet. Kuota builds the transactions
              and never holds your keys.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/launch" className={btnOnBrand}>
                Launch a kuota for your API
              </Link>
              <Link href="/providers" className={btnOnBrandOutline}>
                See providers
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
