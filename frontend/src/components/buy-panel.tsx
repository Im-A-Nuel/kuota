"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useId, useState } from "react";
import { formatCount, formatUsdc } from "@/lib/format";
import { useWalletDialog } from "./wallet-provider";

const AMOUNTS = [1, 2, 3, 4, 5];

interface Props {
  symbol: string;
  priceKuotaUsdc: string;
  usdcPrice: string;
  endpointHost: string;
  graduated: boolean;
}

export function BuyPanel({ symbol, priceKuotaUsdc, usdcPrice, endpointHost, graduated }: Props) {
  const [usd, setUsd] = useState(1);
  const groupId = useId();
  const { publicKey } = useWallet();
  const { open } = useWalletDialog();

  const price = Number(priceKuotaUsdc);
  const retail = Number(usdcPrice);
  const calls = price > 0 ? Math.floor(usd / price) : 0;
  const retailCost = calls * retail;
  const saving = Math.max(0, retailCost - usd);

  return (
    <section
      aria-labelledby={`${groupId}-title`}
      className="rounded-panel border border-line bg-paper p-5 shadow-[0_30px_60px_-36px_rgba(14,19,48,0.45)]"
    >
      <h2 id={`${groupId}-title`} className="text-2xl font-light">
        Buy {symbol}
      </h2>

      <fieldset className="mt-4">
        <legend className="text-sm font-semibold text-mute">Amount in USD</legend>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {AMOUNTS.map((a) => (
            <label key={a} className="relative">
              <input
                type="radio"
                name={`${groupId}-amount`}
                value={a}
                checked={usd === a}
                onChange={() => setUsd(a)}
                className="peer sr-only"
              />
              <span className="flex min-h-12 cursor-pointer items-center justify-center rounded-full border border-line-strong font-semibold peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-ink peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink hover:border-accent">
                ${a}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <dl className="mt-5 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-mute">You get about</dt>
          <dd className="font-semibold">{formatCount(calls)} kuota</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-mute">Calls on {endpointHost}</dt>
          <dd className="font-semibold">{formatCount(calls)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-mute">Same calls paid in USDC</dt>
          <dd className="font-semibold">{formatUsdc(retailCost, 2)} USDC</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-line pt-2">
          <dt className="text-mute">You save compared with USDC</dt>
          <dd className="font-semibold text-teal">{formatUsdc(saving, 2)} USDC</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-mute">
        Estimate before trading fees and slippage.{" "}
        {graduated ? "Priced from the DAMM v2 pool." : "Priced from the curve."}
      </p>

      {publicKey ? (
        <>
          {/* TODO: request an unsigned swap transaction from the backend once that endpoint exists. */}
          <button
            type="button"
            disabled
            className="mt-5 min-h-12 w-full cursor-not-allowed rounded-full border border-dashed border-line-strong px-4 font-semibold text-mute"
          >
            Buy ${usd} of kuota
          </button>
          <p className="mt-2 text-sm">
            Coming soon. Buying needs the swap endpoint on the backend, which is not built yet.
          </p>
        </>
      ) : (
        <button
          type="button"
          onClick={open}
          aria-haspopup="dialog"
          className="mt-5 min-h-12 w-full cursor-pointer rounded-full bg-accent px-4 font-semibold text-accent-ink hover:bg-accent-deep"
        >
          Connect wallet to buy
        </button>
      )}
    </section>
  );
}
