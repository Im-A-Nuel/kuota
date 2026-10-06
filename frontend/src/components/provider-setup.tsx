import { CLUSTER } from "@/lib/config";
import { CodeBlock } from "./code-block";

// CAIP-2 ids for the Solana clusters, as x402 V2 expects them.
const NETWORK =
  CLUSTER === "mainnet-beta"
    ? "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
    : "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";

export function ProviderSetup({
  mint,
  usdcPrice = "0.01",
  headingLevel = 2,
}: {
  mint?: string | null;
  usdcPrice?: string;
  headingLevel?: 2 | 3;
}) {
  const H = headingLevel === 2 ? "h2" : "h3";
  const code = `import { kuotaPaywall } from "@kuota/x402";

app.use("/v1/resource", kuotaPaywall({
  network: "${NETWORK}",
  payTo: "<YOUR_WALLET>",
  usdcPrice: "${usdcPrice}",
  kuotaMint: "${mint ?? "<KUOTA_MINT>"}",
  facilitatorUrl: "<FACILITATOR_URL>",
}));`;

  return (
    <div>
      <H className="text-3xl font-extrabold">After launch, three things on your side</H>
      <p className="mt-2 max-w-prose text-mute">
        The package below is not released yet. Its options follow the project docs and will be
        checked against the x402 SDK before release.
      </p>

      <ol className="mt-6 space-y-8">
        <li className="grid gap-3 sm:grid-cols-[2.5rem_1fr]">
          <span className="font-display text-3xl font-extrabold leading-none" aria-hidden="true">1</span>
          <div className="min-w-0 space-y-3">
            <p className="font-bold">Add kuota as a second price in your 402 response</p>
            <p className="text-sm text-mute">
              Your endpoint keeps the USDC price and adds one entry for 1 kuota. Callers pick
              either.
            </p>
            <CodeBlock code={code} label="kuotaPaywall setup" />
          </div>
        </li>

        <li className="grid gap-3 sm:grid-cols-[2.5rem_1fr]">
          <span className="font-display text-3xl font-extrabold leading-none" aria-hidden="true">2</span>
          <div className="space-y-1">
            <p className="font-bold">Keep a kuota token account on your wallet</p>
            <p className="text-sm text-mute">
              Payments arrive as a transfer to that account, and the payment transaction does not
              create it. Make sure it exists before the first paid call.
            </p>
          </div>
        </li>

        <li className="grid gap-3 sm:grid-cols-[2.5rem_1fr]">
          <span className="font-display text-3xl font-extrabold leading-none" aria-hidden="true">3</span>
          <div className="space-y-2">
            <p className="font-bold">Approve the burn delegate</p>
            <p className="text-sm text-mute">
              Kuota&apos;s burner burns the kuota you receive every 10 minutes. You set its
              allowance, about one day of expected calls. An SPL delegate can burn or move tokens
              up to that allowance, so keep it small. You can revoke it at any time, or run the
              burn job yourself instead.
            </p>
            {/* TODO: build the SPL approve transaction once the backend exposes the burner address. */}
            <button
              type="button"
              disabled
              className="min-h-11 cursor-not-allowed rounded-control border-[1.5px] border-dashed border-ink px-4 text-sm font-bold text-mute"
            >
              Approve delegate
            </button>
            <p className="text-sm">Coming soon. Needs the burner address from the backend.</p>
          </div>
        </li>
      </ol>
    </div>
  );
}
