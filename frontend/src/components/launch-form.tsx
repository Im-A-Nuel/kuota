"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useId, useMemo, useState } from "react";
import { buildLaunch, usingSampleData } from "@/lib/api";
import { estimateCurve, validateLaunchParams } from "@/lib/curve";
import { formatCount, formatUsdc } from "@/lib/format";
import { ApiError, type BuildLaunchResult } from "@/lib/types";
import { CurveChart } from "./curve-chart";
import { ErrorState } from "./states";
import { Voucher } from "./voucher";
import { useWalletDialog } from "./wallet-provider";

const input =
  "mt-1 min-h-12 w-full rounded-control border-[1.5px] border-ink bg-paper px-3 text-base placeholder:text-mute aria-[invalid=true]:border-accent-text";

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (props: { id: string; describedBy: string; invalid: boolean }) => React.ReactNode;
}) {
  const id = useId();
  const describedBy = `${id}-hint ${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      <p id={`${id}-hint`} className="mt-1 text-sm text-mute">
        {hint}
      </p>
      <p id={`${id}-error`} role={error ? "alert" : undefined} className="text-sm font-semibold text-accent-text">
        {error}
      </p>
    </div>
  );
}

type Phase =
  | { kind: "idle" }
  | { kind: "building" }
  | { kind: "error"; message: string }
  | { kind: "built"; result: BuildLaunchResult };

export function LaunchForm() {
  const { publicKey } = useWallet();
  const { open: openWallet } = useWalletDialog();

  const [price, setPrice] = useState("0.01");
  const [calls, setCalls] = useState("150000");
  const [threshold, setThreshold] = useState("750");
  const [feePct, setFeePct] = useState("30");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [uri, setUri] = useState("");
  const [firstBuy, setFirstBuy] = useState("1");
  const [submitted, setSubmitted] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const params = useMemo(
    () => ({
      usdcPricePerCall: price,
      committedCalls: Number(calls),
      migrationThresholdUsdc: Number(threshold),
      migrationFeeBps: Math.round(Number(feePct) * 100),
    }),
    [price, calls, threshold, feePct],
  );

  const paramErrors = validateLaunchParams(params);
  const simulation = useMemo(() => estimateCurve(params), [params]);

  const errors = {
    ...paramErrors,
    name: name.trim() ? undefined : "Give the token a name.",
    symbol: /^[A-Za-z0-9-]{2,10}$/.test(symbol) ? undefined : "Use 2 to 10 letters, digits or dashes.",
    endpoint: /^https:\/\/.+\..+/.test(endpoint) ? undefined : "Enter the full https:// address of your x402 endpoint.",
    uri: /^(https:\/\/|ipfs:\/\/|ar:\/\/).+/.test(uri) ? undefined : "Enter an https://, ipfs:// or ar:// metadata link.",
    firstBuy: Number(firstBuy) >= 0 && firstBuy.trim() !== "" ? undefined : "Enter 0 or more.",
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  const startPrice = Number(price) * 0.5;
  const feeUsdc = (Number(threshold) * Number(feePct)) / 100;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (hasErrors) return;
    if (!publicKey) {
      openWallet();
      return;
    }
    setPhase({ kind: "building" });
    try {
      const result = await buildLaunch({
        ...params,
        providerPubkey: publicKey.toBase58(),
        name: name.trim(),
        symbol,
        uri,
        endpointUrl: endpoint,
        firstBuyUsdc: Number(firstBuy),
      });
      // TODO: sign both transactions in the wallet, send them, then POST /launch/confirm.
      setPhase({ kind: "built", result });
    } catch (err) {
      setPhase({
        kind: "error",
        message: err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  }

  const building = phase.kind === "building";

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-12 lg:grid-cols-12">
      <div className="space-y-10 lg:col-span-6">
        <fieldset className="space-y-5">
          <legend className="font-display text-3xl font-extrabold">Pricing and supply</legend>
          <Field label="Price of one call in USDC" hint="What a caller pays today with USDC." error={show("usdcPricePerCall")}>
            {(p) => (
              <input id={p.id} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} className={input} />
            )}
          </Field>
          <Field label="Calls you commit to serve" hint="Becomes the fixed supply. 1 kuota is 1 call." error={show("committedCalls")}>
            {(p) => (
              <input id={p.id} inputMode="numeric" value={calls} onChange={(e) => setCalls(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} className={input} />
            )}
          </Field>
          <Field label="Graduation threshold in USDC" hint="When buyers have put in this much, the pool moves to DAMM v2." error={show("migrationThresholdUsdc")}>
            {(p) => (
              <input id={p.id} inputMode="decimal" value={threshold} onChange={(e) => setThreshold(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} className={input} />
            )}
          </Field>
          <Field label="Migration fee in percent" hint="Share of the threshold paid to you at graduation." error={show("migrationFeeBps")}>
            {(p) => (
              <input id={p.id} inputMode="numeric" value={feePct} onChange={(e) => setFeePct(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} className={input} />
            )}
          </Field>
        </fieldset>

        <fieldset className="space-y-5">
          <legend className="font-display text-3xl font-extrabold">Token and endpoint</legend>
          <Field label="Token name" error={show("name")}>
            {(p) => (
              <input id={p.id} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your token name" autoComplete="off" aria-invalid={p.invalid} aria-describedby={p.describedBy} className={input} />
            )}
          </Field>
          <Field label="Symbol" error={show("symbol")}>
            {(p) => (
              <input id={p.id} value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="Your symbol" autoComplete="off" aria-invalid={p.invalid} aria-describedby={p.describedBy} className={input} />
            )}
          </Field>
          <Field label="x402 endpoint" hint="The API this kuota pays for. It needs one extra entry in accepts." error={show("endpoint")}>
            {(p) => (
              <input id={p.id} type="url" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://your-api.example/v1/resource" aria-invalid={p.invalid} aria-describedby={p.describedBy} className={input} />
            )}
          </Field>
          <Field label="Token metadata link" hint="A JSON file with the token name, symbol and image." error={show("uri")}>
            {(p) => (
              <input id={p.id} value={uri} onChange={(e) => setUri(e.target.value)} placeholder="https://, ipfs:// or ar:// link" aria-invalid={p.invalid} aria-describedby={p.describedBy} className={input} />
            )}
          </Field>
          <Field label="Your first buy in USDC" hint="Optional. You buy at the opening price in the same launch." error={show("firstBuy")}>
            {(p) => (
              <input id={p.id} inputMode="decimal" value={firstBuy} onChange={(e) => setFirstBuy(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} className={input} />
            )}
          </Field>
        </fieldset>
      </div>

      <div className="space-y-6 lg:col-span-6">
        <div className="lg:sticky lg:top-6 space-y-6">
          <Voucher
            data={{
              name: name.trim() || "Your token name",
              symbol: symbol || "Your symbol",
              mint: null,
              status: "curve",
              priceKuotaUsdc: String(startPrice),
              usdcPrice: price,
              discountBps: simulation.discountStartBps,
              curveProgressBps: 0,
              endpointUrl: endpoint,
            }}
          />

          <div className="rounded-panel border-[1.5px] border-ink bg-card p-5">
            {simulation.curve.length > 0 ? (
              <CurveChart
                title="Your price curve (estimate)"
                points={simulation.curve}
                usdcPrice={Number(price)}
              />
            ) : (
              <p className="text-mute">Fill in the pricing fields to see your curve.</p>
            )}
          </div>

          <dl className="border-t-[1.5px] border-ink text-sm">
            {[
              ["Buyers’ discount", `${simulation.discountStartBps / 100}% at the start, ${simulation.discountEndBps / 100}% at the end`],
              ["Calls sold at graduation", simulation.callsSoldAtThreshold ? formatCount(simulation.callsSoldAtThreshold) : "n/a"],
              ["Migration fee paid to you", feeUsdc > 0 ? `${formatUsdc(feeUsdc, 2)} USDC` : "n/a"],
            ].map(([t, v]) => (
              <div key={t} className="flex justify-between gap-4 border-b border-rule py-2">
                <dt className="text-mute">{t}</dt>
                <dd className="text-right font-bold">{v}</dd>
              </div>
            ))}
          </dl>

          {simulation.warnings.map((w) => (
            <p key={w} role="alert" className="rounded-control border-[1.5px] border-accent-text p-3 text-sm font-semibold">
              {w}
            </p>
          ))}
          <p className="text-sm text-mute">
            This preview is an estimate. The final config is validated by the Meteora SDK on the
            backend before you sign anything.
          </p>

          <div>
            <button
              type="submit"
              disabled={building}
              className="min-h-12 w-full cursor-pointer rounded-control bg-accent px-4 font-bold text-accent-ink hover:brightness-95 disabled:cursor-wait disabled:opacity-70"
            >
              {building ? "Building transactions" : publicKey ? "Build launch transactions" : "Connect wallet to launch"}
            </button>
            {submitted && hasErrors && (
              <p role="alert" className="mt-2 text-sm font-semibold text-accent-text">
                Fix the highlighted fields first.
              </p>
            )}
            {usingSampleData && (
              <p className="mt-2 text-sm text-mute">
                The backend is not connected, so building will report that instead of producing
                transactions.
              </p>
            )}
          </div>

          <div aria-live="polite">
            {phase.kind === "error" && (
              <ErrorState
                title="Could not build the launch."
                body={phase.message}
                onRetry={() => setPhase({ kind: "idle" })}
              />
            )}
            {phase.kind === "built" && (
              <div className="rounded-panel border-[1.5px] border-teal p-5">
                <p className="font-display text-xl font-bold text-teal">
                  {phase.result.transactions.length} transactions are ready.
                </p>
                <p className="mt-1 text-sm">
                  Signing and confirming in your wallet comes next. Coming soon.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
