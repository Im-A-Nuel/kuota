import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { CurveChart } from "@/components/curve-chart";
import { HeroLoop } from "@/components/hero-loop";
import { ArrowBadge, ArrowRight, CheckDot } from "@/components/icons";
import { usingSampleData } from "@/lib/api";
import { estimateCurve } from "@/lib/curve";
import { wholeUnits } from "@/lib/format";
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
  { value: "1 : 1", label: "One kuota pays for one call. Supply equals the calls a provider commits." },
  { value: "50 to 85%", label: "Of the USDC price while the curve runs. Never above it." },
  { value: "10 min", label: "Between burns. Burned supply always equals calls served." },
];

function ProvidersIcon() {
  return (
    <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
      <circle cx="16" cy="16" r="10" fill="var(--accent)" />
      <circle cx="32" cy="16" r="10" fill="none" stroke="var(--accent)" strokeWidth="2" />
      <circle cx="16" cy="32" r="10" fill="none" stroke="var(--accent)" strokeWidth="2" />
      <circle cx="32" cy="32" r="10" fill="none" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  );
}

function AgentsIcon() {
  return (
    <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
      <defs>
        <linearGradient id="cap-coin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c9d2ff" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <ellipse cx="24" cy="24" rx="12" ry="18" transform="rotate(-35 24 24)" fill="url(#cap-coin)" />
      <ellipse cx="24" cy="24" rx="6" ry="12" transform="rotate(-35 24 24)" fill="none" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="2" />
    </svg>
  );
}

function LedgerIcon() {
  return (
    <svg viewBox="0 0 48 48" width="44" height="44" fill="none" aria-hidden="true">
      <path d="M6 30c6-12 14-12 18 0s12 12 18 0" stroke="var(--line-strong)" strokeWidth="3" strokeLinecap="round" />
      <path d="M6 22c6-12 14-12 18 0s12 12 18 0" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

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

  const capabilities = [
    {
      icon: <ProvidersIcon />,
      title: "Pre-sell capacity",
      body: "Providers turn the calls they can serve into a fixed-supply token. Early buyers get a discount, the provider earns trading fees from the first minute and capital at graduation.",
      href: "/launch",
      link: "See the launch flow",
    },
    {
      icon: <AgentsIcon />,
      title: "Pay the cheaper price",
      body: "Agents swap fetch for kuotaFetch. On every 402 it compares one kuota with the USDC price and pays whichever costs less, inside an hourly budget.",
      href: "#agents",
      link: "See the agent client",
    },
    {
      icon: <LedgerIcon />,
      title: "Burned in public",
      body: "Every kuota spent on a call is burned within 10 minutes, and every burn gets a row in a public ledger anyone can re-check.",
      href: ledgerHref,
      link: usingSampleData ? "Open the sample ledger" : "Open a live ledger",
    },
  ];

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
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-ink">New</span>
              <span className="text-mute">Built for x402 APIs on Solana</span>
            </p>
            <p className="mt-4 text-lg text-mute">
              One kuota is one call on an x402 API. Providers sell capacity up front on a bonding
              curve, agents pay with kuota when it costs less than USDC, and every spent kuota is{" "}
              <span className="font-semibold text-accent">burned</span>.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/providers" className={btnPrimary}>
                Browse live kuota
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

        <div {...reveal(0)} className="mt-10 flex flex-col gap-6 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs text-mute">Built on</p>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
              {STACK.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
          <ul className="flex flex-wrap gap-2">
            {["Prepaid", "Tradeable", "Burned when spent"].map((t) => (
              <li key={t} className={`${chip} text-ink`}>
                <CheckDot className="text-accent" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Facts band */}
      <section className={`${sectionX} mt-16`} aria-label="How kuota is set up">
        <div {...reveal(0)} className="brand-band grid grid-cols-1 gap-8 rounded-panel p-4 sm:p-6 lg:grid-cols-4 lg:items-center">
          <svg
            viewBox="0 0 1200 300"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 size-full"
            aria-hidden="true"
          >
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

      {/* Capabilities */}
      <section className={`${sectionX} mt-24 grid grid-cols-1 gap-12 lg:grid-cols-12`}>
        <div {...reveal(0)} className="lg:col-span-5">
          <h2 className="text-5xl font-light">What kuota does</h2>
          <p className="mt-5 max-w-md text-mute">
            One token, three jobs: it funds providers early, lowers what agents pay per call, and
            leaves a public record of every call served.
          </p>
        </div>
        <ul className="lg:col-span-7">
          {capabilities.map((c, i) => (
            <li key={c.title} {...reveal(i * 120)} className="grid grid-cols-[3.5rem_1fr] gap-6 border-b border-line py-8 first:pt-0">
              <div className="pt-1">{c.icon}</div>
              <div className="border-l border-line pl-6">
                <h3 className="text-2xl font-normal">{c.title}</h3>
                <p className="mt-3 text-mute">{c.body}</p>
                <Link
                  href={c.href}
                  className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
                >
                  {c.link}
                  <ArrowRight />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Payment and agent client */}
      <section id="agents" className={`${sectionX} mt-24 scroll-mt-8`}>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div {...reveal(0)} className="lg:col-span-5">
            <h2 className="text-5xl font-light">
              One endpoint, <span className="text-accent">two ways to pay</span>
            </h2>
            <p className="mt-5 text-mute">
              The provider&apos;s API answers 402 with two prices: the USDC price, or one kuota.
              Agents swap <code className="font-semibold text-ink">fetch</code> for{" "}
              <code className="font-semibold text-ink">kuotaFetch</code>, which follows one rule in
              this order:
            </p>
            <ol className="mt-6 space-y-4">
              {[
                ["Pay with kuota", "when you hold at least 1 and it costs no more than the USDC price."],
                ["Buy a batch, then pay with kuota", "when you hold none, a batch of 100 is cheaper even after slippage, and it fits your hourly budget."],
                ["Pay with USDC", "in every other case."],
              ].map(([term, value], i) => (
                <li key={term} className="flex gap-4">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-wash text-sm font-semibold text-accent">
                    {i + 1}
                  </span>
                  <p>
                    <span className="font-semibold">{term}</span>{" "}
                    <span className="text-mute">{value}</span>
                  </p>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-sm text-mute">
              Design preview. The middleware and the client are not released yet; field names
              follow x402 V2 and are checked against the SDK before release.
            </p>
          </div>
          <div {...reveal(150)} className="min-w-0 space-y-4 lg:col-span-7">
            <CodeBlock label="Example 402 response body" code={RESPONSE_402} />
            <CodeBlock label="kuotaFetch example" code={AGENT_SNIPPET} />
          </div>
        </div>
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

      {/* Ledger */}
      <section className={`${sectionX} mt-24 grid grid-cols-1 gap-10 lg:grid-cols-12`}>
        <div {...reveal(0)} className="lg:col-span-7">
          <h2 className="text-5xl font-light">Spent kuota is burned, in public</h2>
          <p className="mt-5 max-w-prose text-mute">
            The provider&apos;s balance is burned every 10 minutes through an SPL delegate, so
            burned supply always equals calls served.
          </p>
          <ul className="mt-6 border-t border-line">
            {burns.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-4 border-b border-line py-4">
                <span className="text-2xl font-light">{wholeUnits(b.amount)} kuota</span>
                <span className="flex items-center gap-3">
                  <span className="hidden text-sm text-mute sm:inline">sample, no transaction</span>
                  <span className={`${chip} border-teal/40 bg-teal-wash text-teal`}>Burned</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <aside {...reveal(150)} className="lg:col-span-5 lg:pt-20">
          <p className="text-sm text-mute">The accounting identity</p>
          <p className="mt-2 rounded-panel bg-card p-6 text-2xl font-light leading-snug">
            circulating = supply &minus; burned &minus; balance in curve or pool
          </p>
          <p className="mt-3 text-sm text-mute">
            The rule the ledger has to satisfy at every snapshot, so anyone can re-check the
            numbers with a query.
          </p>
        </aside>
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
              <code>createPoolWithFirstBuy</code> in your own wallet. Creator share of trading
              fees is 50%, the migration fee goes to you, and liquidity is locked permanently
              after graduation.
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
