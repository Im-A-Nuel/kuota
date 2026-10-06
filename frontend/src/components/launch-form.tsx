"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useId, useMemo, useRef, useState } from "react";
import { buildLaunch, usingSampleData } from "@/lib/api";
import { estimateCurve, validateLaunchParams } from "@/lib/curve";
import { formatCount, formatUsdc, parseLooseNumber } from "@/lib/format";
import { ApiError, type BuildLaunchResult } from "@/lib/types";
import { CurveChart } from "./curve-chart";
import { ErrorNote, ErrorState } from "./states";
import { Voucher } from "./voucher";
import { useWalletDialog } from "./wallet-provider";

const input =
  "mt-1 min-h-12 w-full rounded-control border-[1.5px] border-ink bg-paper px-3 text-base placeholder:text-mute aria-[invalid=true]:border-[3px]";

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
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
  return (
    <div>
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-mute">
          {hint}
        </p>
      )}
      {error && (
        <div className="mt-1">
          <ErrorNote id={`${id}-error`}>{error}</ErrorNote>
        </div>
      )}
    </div>
  );
}

type Phase =
  | { kind: "idle" }
  | { kind: "building" }
  | { kind: "error"; message: string }
  | { kind: "built"; result: BuildLaunchResult };

type StepStatus = "done" | "current" | "failed" | "waiting" | "soon";

const STATUS_TEXT: Record<StepStatus, string> = {
  done: "Done",
  current: "In progress",
  failed: "Failed",
  waiting: "Waiting",
  soon: "Coming soon",
};

function LaunchSteps({ connected, phase }: { connected: boolean; phase: Phase }) {
  const build: StepStatus =
    phase.kind === "building"
      ? "current"
      : phase.kind === "error"
        ? "failed"
        : phase.kind === "built"
          ? "done"
          : "waiting";
  const signing: StepStatus = phase.kind === "built" ? "soon" : "waiting";
  const steps: [string, string, StepStatus][] = [
    ["Connect your wallet", "The wallet that will own the kuota and receive fees.", connected ? "done" : "current"],
    ["Build the transactions", "Kuota prepares two unsigned transactions.", connected ? build : "waiting"],
    ["Sign createConfig", "First wallet prompt: the curve and fee settings.", signing],
    ["Sign createPoolWithFirstBuy", "Second wallet prompt: the pool, plus your first buy.", signing],
    ["Confirm and list", "Kuota records the launch and lists it on Providers.", "waiting"],
  ];

  return (
    <ol aria-label="Launch progress" className="border-t-[1.5px] border-ink">
      {steps.map(([title, body, status], i) => (
        <li
          key={title}
          aria-current={status === "current" ? "step" : undefined}
          className={`grid grid-cols-[1.75rem_1fr_auto] items-baseline gap-x-3 border-b border-rule py-3 ${
            status === "waiting" || status === "soon" ? "text-mute" : ""
          }`}
        >
          <span className="font-display text-lg font-extrabold">{i + 1}</span>
          <span>
            <span className="block text-sm font-bold">{title}</span>
            <span className="block text-sm">{body}</span>
          </span>
          <span className={`text-sm font-bold ${status === "done" ? "text-teal" : ""}`}>
            {STATUS_TEXT[status]}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Accepts "0,01" as a decimal comma when there is no dot. */
function parsePrice(raw: string): number {
  const s = raw.trim();
  return parseLooseNumber(s.includes(",") && !s.includes(".") ? s.replace(",", ".") : s);
}

export function LaunchForm() {
  const { publicKey } = useWallet();
  const { open: openWallet } = useWalletDialog();
  const formRef = useRef<HTMLFormElement>(null);

  const [price, setPrice] = useState("0.01");
  const [calls, setCalls] = useState("150,000");
  const [threshold, setThreshold] = useState("750");
  const [feePct, setFeePct] = useState("30");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [uri, setUri] = useState("");
  const [firstBuy, setFirstBuy] = useState("1");
  const [submitted, setSubmitted] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const params = useMemo(() => {
    const priceNum = parsePrice(price);
    return {
      usdcPricePerCall: Number.isFinite(priceNum) ? String(priceNum) : "",
      committedCalls: parseLooseNumber(calls, { integer: true }),
      migrationThresholdUsdc: parseLooseNumber(threshold),
      migrationFeeBps: Math.round(parseLooseNumber(feePct) * 100),
    };
  }, [price, calls, threshold, feePct]);

  const paramErrors = validateLaunchParams(params);
  const paramsValid = Object.keys(paramErrors).length === 0;
  const simulation = useMemo(() => estimateCurve(params), [params]);
  const firstBuyNum = firstBuy.trim() === "" ? 0 : parseLooseNumber(firstBuy);

  const errors = {
    ...paramErrors,
    name: name.trim() ? undefined : "Give the token a name.",
    symbol: /^[A-Za-z0-9-]{2,10}$/.test(symbol) ? undefined : "Use 2 to 10 letters, digits or dashes.",
    endpoint: /^https:\/\/.+\..+/.test(endpoint) ? undefined : "Enter the full https:// address of your x402 endpoint.",
    uri: /^(https:\/\/|ipfs:\/\/|ar:\/\/).+/.test(uri) ? undefined : "Enter an https://, ipfs:// or ar:// metadata link.",
    firstBuy: firstBuyNum >= 0 ? undefined : "Enter 0 or more, or leave it empty.",
  };
  const errorCount = Object.values(errors).filter(Boolean).length;
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  const priceNum = Number(params.usdcPricePerCall);
  const feeUsdc = (params.migrationThresholdUsdc * params.migrationFeeBps) / 10000;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (errorCount > 0) {
      // Wait for the invalid state to render, then put the user on the first field to fix.
      requestAnimationFrame(() => {
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      });
      return;
    }
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
        firstBuyUsdc: firstBuyNum,
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
  const field = (p: { id: string; describedBy: string; invalid: boolean }) => ({
    id: p.id,
    "aria-invalid": p.invalid,
    "aria-describedby": p.describedBy || undefined,
    className: input,
  });

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-12 lg:grid-cols-12">
      <div className="space-y-10 lg:col-span-6">
        <fieldset className="space-y-5">
          <legend className="font-display text-3xl font-extrabold">Pricing and supply</legend>
          <Field label="Price of one call in USDC" hint="What a caller pays today with USDC." error={show("usdcPricePerCall")}>
            {(p) => <input {...field(p)} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />}
          </Field>
          <Field label="Calls you commit to serve" hint="Becomes the fixed supply. 1 kuota is 1 call. Separators like 150,000 are fine." error={show("committedCalls")}>
            {(p) => <input {...field(p)} inputMode="numeric" value={calls} onChange={(e) => setCalls(e.target.value)} />}
          </Field>
          <Field label="Graduation threshold in USDC" hint="When buyers have put in this much, the pool moves to DAMM v2." error={show("migrationThresholdUsdc")}>
            {(p) => <input {...field(p)} inputMode="decimal" value={threshold} onChange={(e) => setThreshold(e.target.value)} />}
          </Field>
          <Field label="Migration fee in percent" hint="Share of the threshold paid to you at graduation." error={show("migrationFeeBps")}>
            {(p) => <input {...field(p)} inputMode="decimal" value={feePct} onChange={(e) => setFeePct(e.target.value)} />}
          </Field>
        </fieldset>

        <fieldset className="space-y-5">
          <legend className="font-display text-3xl font-extrabold">Token and endpoint</legend>
          <Field label="Token name" error={show("name")}>
            {(p) => <input {...field(p)} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your token name" autoComplete="off" />}
          </Field>
          <Field label="Symbol" error={show("symbol")}>
            {(p) => <input {...field(p)} value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="Your symbol" autoComplete="off" />}
          </Field>
          <Field label="x402 endpoint" hint="The API this kuota pays for." error={show("endpoint")}>
            {(p) => <input {...field(p)} type="url" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://your-api.example/v1/resource" />}
          </Field>
          <Field label="Token metadata link" hint="A JSON file with the token name, symbol and image." error={show("uri")}>
            {(p) => <input {...field(p)} value={uri} onChange={(e) => setUri(e.target.value)} placeholder="https://, ipfs:// or ar:// link" />}
          </Field>
          <Field label="Your first buy in USDC" hint="Optional. You buy at the opening price in the same launch. Leave empty to skip." error={show("firstBuy")}>
            {(p) => <input {...field(p)} inputMode="decimal" value={firstBuy} onChange={(e) => setFirstBuy(e.target.value)} />}
          </Field>
        </fieldset>
      </div>

      <div className="lg:col-span-6">
        <div className="space-y-6 lg:sticky lg:top-6">
          {paramsValid ? (
            <>
              <Voucher
                data={{
                  name: name.trim() || "Your token name",
                  symbol: symbol || "Your symbol",
                  mint: null,
                  status: "curve",
                  priceKuotaUsdc: String(priceNum * 0.5),
                  usdcPrice: String(priceNum),
                  discountBps: simulation.discountStartBps,
                  curveProgressBps: 0,
                  endpointUrl: endpoint,
                  preview: true,
                }}
              />
              <div className="rounded-panel border-[1.5px] border-ink bg-card p-5">
                <CurveChart title="Your price curve (estimate)" points={simulation.curve} usdcPrice={priceNum} />
              </div>
              <dl className="border-t-[1.5px] border-ink text-sm">
                {[
                  ["Buyers’ discount", `${simulation.discountStartBps / 100}% at the start, ${simulation.discountEndBps / 100}% at the end`],
                  ["Calls sold at graduation", formatCount(simulation.callsSoldAtThreshold)],
                  ["Migration fee paid to you", `${formatUsdc(feeUsdc, 2)} USDC`],
                ].map(([t, v]) => (
                  <div key={t} className="flex justify-between gap-4 border-b border-rule py-2">
                    <dt className="text-mute">{t}</dt>
                    <dd className="text-right font-bold">{v}</dd>
                  </div>
                ))}
              </dl>
              {simulation.warnings.map((w) => (
                <div key={w} className="rounded-control border-[1.5px] border-ink p-3">
                  <ErrorNote>{w}</ErrorNote>
                </div>
              ))}
              <p className="text-sm text-mute">
                This preview is an estimate. The final config is validated by the Meteora SDK on
                the backend before you sign anything.
              </p>
            </>
          ) : (
            <div className="rounded-panel border-[1.5px] border-dashed border-ink p-6">
              <p className="font-display text-xl font-bold">No preview yet</p>
              <p className="mt-1 text-mute">
                Fix the pricing and supply fields to see your voucher and curve.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={building}
              className="min-h-12 w-full cursor-pointer rounded-control bg-accent px-4 font-bold text-accent-ink hover:brightness-95 disabled:cursor-wait disabled:opacity-70"
            >
              {building ? "Building transactions" : publicKey ? "Build launch transactions" : "Connect wallet to launch"}
            </button>
            <div aria-live="polite">
              {submitted && errorCount > 0 && (
                <ErrorNote>
                  {errorCount === 1 ? "1 field needs fixing." : `${errorCount} fields need fixing.`} The
                  first one is selected.
                </ErrorNote>
              )}
            </div>
            {usingSampleData && (
              <p className="text-sm text-mute">
                The backend is not connected, so building will report that instead of producing
                transactions.
              </p>
            )}
          </div>

          <LaunchSteps connected={Boolean(publicKey)} phase={phase} />

          {phase.kind === "error" && (
            <ErrorState
              title="Could not build the launch."
              body={phase.message}
              onRetry={() => setPhase({ kind: "idle" })}
            />
          )}
          {phase.kind === "built" && (
            <div role="status" className="rounded-panel border-[1.5px] border-teal p-5">
              <p className="font-display text-xl font-bold text-teal">
                {phase.result.transactions.length} transactions are ready.
              </p>
              <p className="mt-1 text-sm">Signing them in your wallet is coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
