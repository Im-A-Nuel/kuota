import { HTTPFacilitatorClient, x402ResourceServer, type FacilitatorClient } from "@x402/core/server";
import { paymentMiddleware } from "@x402/express";
import { USDC_DEVNET_ADDRESS, USDC_MAINNET_ADDRESS } from "@x402/svm";
import { ExactSvmScheme } from "@x402/svm/exact/server";
import type { RequestHandler } from "express";

/** CAIP-2 ids x402 V2 uses for Solana. */
export const SOLANA_DEVNET = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
export const SOLANA_MAINNET = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";

const DECIMALS = 6;
const ONE_KUOTA = 10n ** BigInt(DECIMALS);

export interface SettledPayment {
  /** Settlement transaction signature. */
  signature: string;
  payer: string;
  asset: "kuota" | "usdc";
  /** Base units of the asset that moved. */
  amount: bigint;
  network: string;
}

export interface KuotaPaywallConfig {
  /** CAIP-2 network id, for example `SOLANA_DEVNET`. */
  network: `${string}:${string}`;
  /** Provider wallet. It must already own token accounts for the kuota mint and for USDC. */
  payTo: string;
  /** What one call costs in USDC, as a decimal string such as "0.01". */
  usdcPrice: string;
  kuotaMint: string;
  /** Calls one whole kuota buys. Defaults to 1, so one call costs one kuota. */
  callsPerToken?: number;
  /** Facilitator that verifies and settles. Required unless `facilitator` is given. */
  facilitatorUrl?: string;
  /** An in-process facilitator client. Takes precedence over `facilitatorUrl`. */
  facilitator?: FacilitatorClient;
  /** Defaults to Circle USDC of the network. Required for other networks. */
  usdcMint?: string;
  /** RPC used to embed a recent blockhash in the challenge. Optional. */
  rpcUrl?: string;
  description?: string;
  /** Called after each settled payment, for example to record it. Errors are swallowed. */
  onSettled?: (payment: SettledPayment) => void | Promise<void>;
}

/** "0.01" to 10000n, without going through a floating point number. */
export function toBaseUnits(value: string, decimals = DECIMALS): bigint {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) throw new Error(`"${value}" is not a decimal amount`);
  const [, whole, fraction = ""] = match;
  if (fraction.length > decimals) throw new Error(`"${value}" has more than ${decimals} decimals`);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0") || "0");
}

function defaultUsdcMint(network: string): string | undefined {
  if (network === SOLANA_DEVNET) return USDC_DEVNET_ADDRESS;
  if (network === SOLANA_MAINNET) return USDC_MAINNET_ADDRESS;
  return undefined;
}

/** The two prices a caller can choose between. Exported so clients and tests can compare. */
export function priceOptions(config: KuotaPaywallConfig) {
  const calls = config.callsPerToken ?? 1;
  if (!Number.isInteger(calls) || calls < 1) throw new Error("callsPerToken must be a whole number of at least 1");
  if (ONE_KUOTA % BigInt(calls) !== 0n) {
    throw new Error(`callsPerToken ${calls} does not divide one kuota into whole base units`);
  }
  const usdcMint = config.usdcMint ?? defaultUsdcMint(config.network);
  if (!usdcMint) throw new Error(`usdcMint is required for network ${config.network}`);

  const usdcAmount = toBaseUnits(config.usdcPrice);
  if (usdcAmount <= 0n) throw new Error("usdcPrice must be above 0");

  return {
    usdc: { asset: usdcMint, amount: usdcAmount.toString() },
    kuota: { asset: config.kuotaMint, amount: (ONE_KUOTA / BigInt(calls)).toString() },
  };
}

/**
 * Express middleware that answers 402 with two ways to pay: the USDC price, or kuota.
 * Everything else (verify, settle, the 402 and PAYMENT-RESPONSE headers) is the stock x402
 * flow, so any x402 client can pay the USDC option unchanged.
 *
 * Mount it on the paid routes: `app.use("/v1", kuotaPaywall({ ... }))`.
 */
export function kuotaPaywall(config: KuotaPaywallConfig): RequestHandler {
  const price = priceOptions(config);
  const facilitator =
    config.facilitator ??
    (config.facilitatorUrl
      ? new HTTPFacilitatorClient({ url: config.facilitatorUrl })
      : (() => {
          throw new Error("kuotaPaywall needs facilitatorUrl or facilitator");
        })());

  const server = new x402ResourceServer(facilitator).register(
    config.network,
    new ExactSvmScheme(config.rpcUrl ? { rpcUrl: config.rpcUrl } : undefined),
  );

  if (config.onSettled) {
    const onSettled = config.onSettled;
    server.onAfterSettle(async ({ result, requirements }) => {
      if (!result.success) return;
      try {
        await onSettled({
          signature: result.transaction,
          payer: result.payer ?? "",
          asset: requirements.asset === config.kuotaMint ? "kuota" : "usdc",
          amount: BigInt(requirements.amount),
          network: result.network,
        });
      } catch {
        // Recording a payment must never fail the call that was already paid for.
      }
    });
  }

  const option = (p: { asset: string; amount: string }) => ({
    scheme: "exact" as const,
    network: config.network,
    payTo: config.payTo,
    price: p,
  });

  return paymentMiddleware(
    {
      accepts: [option(price.usdc), option(price.kuota)],
      description: config.description ?? "Pay with USDC or kuota",
    },
    server,
  );
}
