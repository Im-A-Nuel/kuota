import { x402Client, x402HTTPClient } from "@x402/core/client";
import type { PaymentRequired, PaymentRequirements } from "@x402/core/types";
import { toClientSvmSigner } from "@x402/svm";
import { ExactSvmScheme } from "@x402/svm/exact/client";
import type { KeyPairSigner } from "@solana/kit";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import { HourlyBudget } from "./budget";
import { decide, type Decision } from "./decide";

export class KuotaFetchError extends Error {
  constructor(
    public readonly code: "BUDGET" | "UNAFFORDABLE" | "NO_PAYMENT_OPTION",
    message: string,
  ) {
    super(message);
    this.name = "KuotaFetchError";
  }
}

export interface PaymentDecision {
  option: "usdc" | "kuota";
  reason: "balance" | "refilled" | "usdc-cheaper" | "budget" | "no-kuota-option" | "no-quote";
  /** USDC base units for 1 kuota used in the decision, as a string. Null when unknown. */
  kuotaPriceUsdc: string | null;
  /** USDC base units the endpoint asked for, as a string. Null when it does not take USDC. */
  usdcPrice: string | null;
  refill?: { signature: string; calls: number };
}

export interface KuotaFetchOptions {
  /** The agent's wallet. */
  signer: KeyPairSigner;
  /** CAIP-2 network of the kuota mint. Defaults to Solana devnet. */
  network?: `${string}:${string}`;
  rpcUrl: string;
  kuotaMint: string;
  /** USDC base units the agent may spend per hour on refills and direct USDC payments. */
  budgetUsdcPerHour: number;
  /** Where the market price of 1 kuota in USDC base units comes from. Null means unknown. */
  quote: () => Promise<bigint | null>;
  /**
   * Buys `calls` worth of kuota with USDC. It runs only when the decision rule says buying
   * is cheaper than paying USDC. Omit it to disable refills.
   */
  refill?: (request: { calls: number; kuotaAmount: bigint; maxUsdc: bigint }) => Promise<{ signature: string }>;
  refillBatchCalls?: number;
  slippageBps?: number;
  /** The most kuota one call may cost, base units. Default 1 kuota. */
  maxKuotaPerCall?: bigint;
  /** The most USDC one call may cost, as a dollar string. Default "$1". */
  maxUsdcPerCall?: string;
  onDecision?: (decision: PaymentDecision) => void;
  /** Replaceable for tests. */
  fetch?: typeof fetch;
  /** Replaceable for tests. Defaults to reading the agent's token account over RPC. */
  getKuotaBalance?: () => Promise<bigint>;
  now?: () => number;
}

const USD_BASE_UNITS = 1_000_000;
const DEVNET = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1" as const;

/**
 * A drop-in `fetch` that pays x402 endpoints in whichever of USDC or kuota is cheaper.
 *
 * On a 402 it reads the two prices, checks what the agent holds and what a kuota costs on the
 * market, applies the rule in `decide`, and pays. It never pays more than the USDC option for a
 * call, and it stops at the hourly budget instead of overspending.
 */
export function createKuotaFetch(options: KuotaFetchOptions): typeof fetch {
  const doFetch = options.fetch ?? fetch;
  const batch = options.refillBatchCalls ?? 100;
  const slippageBps = options.slippageBps ?? 100;
  const budget = new HourlyBudget(BigInt(Math.round(options.budgetUsdcPerHour * USD_BASE_UNITS)), options.now);

  const connection = new Connection(options.rpcUrl, "confirmed");
  const ata = getAssociatedTokenAddressSync(new PublicKey(options.kuotaMint), new PublicKey(options.signer.address));
  const getBalance =
    options.getKuotaBalance ??
    (async () => {
      try {
        return BigInt((await connection.getTokenAccountBalance(ata, "confirmed")).value.amount);
      } catch {
        // No token account yet means no kuota.
        return 0n;
      }
    });

  const client = new x402Client()
    .register("solana:*", new ExactSvmScheme(toClientSvmSigner(options.signer), { rpcUrl: options.rpcUrl }))
    // x402 clients refuse any asset that is not a known default. Allowing the kuota mint
    // explicitly, with a cap per payment, is also the guard against a hostile endpoint.
    .setSpendControls({
      maxAmountPerPayment: options.maxUsdcPerCall ?? "$1",
      allowedAssets: [
        {
          network: options.network ?? DEVNET,
          asset: options.kuotaMint,
          maxAmountPerPayment: (options.maxKuotaPerCall ?? 1_000_000n).toString(),
        },
      ],
    });
  const http = new x402HTTPClient(client);

  return async (input, init) => {
    // Keep a copy: the request body can only be read once, and a paid retry sends it again.
    const request = new Request(input, init);
    const retry = request.clone();

    const first = await doFetch(request);
    if (first.status !== 402) return first;

    const body = await first.clone().json().catch(() => undefined);
    const required = http.getPaymentRequiredResponse((name) => first.headers.get(name), body);

    const usdcReq = required.accepts.find((a) => a.asset !== options.kuotaMint);
    const kuotaReq = required.accepts.find((a) => a.asset === options.kuotaMint);
    if (!usdcReq && !kuotaReq) throw new KuotaFetchError("NO_PAYMENT_OPTION", "The endpoint offered no payment option this client can use.");

    const marketPrice = kuotaReq ? await options.quote().catch(() => null) : null;
    const decision: Decision = decide({
      options: {
        usdc: usdcReq ? { amount: BigInt(usdcReq.amount) } : undefined,
        kuota: kuotaReq ? { amount: BigInt(kuotaReq.amount) } : undefined,
      },
      balance: kuotaReq ? await getBalance() : 0n,
      marketPrice,
      slippageBps,
      refillBatchCalls: batch,
      budgetLeft: budget.left(),
    });

    if (decision.option === "none") {
      throw new KuotaFetchError(
        decision.reason === "budget" ? "BUDGET" : "UNAFFORDABLE",
        decision.reason === "budget"
          ? "The hourly budget is used up, so this call was not paid."
          : "The agent cannot pay any of the offered options.",
      );
    }

    const summary = {
      kuotaPriceUsdc: marketPrice === null ? null : marketPrice.toString(),
      usdcPrice: usdcReq ? usdcReq.amount : null,
    };

    let chosen: PaymentRequirements;
    let refillInfo: PaymentDecision["refill"];
    if (decision.option === "kuota") {
      if (decision.reason === "refilled") {
        if (!options.refill) {
          // No way to buy, so fall back to the plain USDC option rather than failing the call.
          if (!usdcReq) throw new KuotaFetchError("UNAFFORDABLE", "Kuota is the only option and refills are not configured.");
          chosen = usdcReq;
          budget.record(BigInt(usdcReq.amount));
          options.onDecision?.({ option: "usdc", reason: "usdc-cheaper", ...summary });
          return pay(required, chosen, retry);
        }
        const result = await options.refill({
          calls: decision.refillCalls!,
          kuotaAmount: BigInt(kuotaReq!.amount) * BigInt(decision.refillCalls!),
          maxUsdc: decision.refillCostUsdc! + (decision.refillCostUsdc! * BigInt(slippageBps)) / 10_000n,
        });
        budget.record(decision.refillCostUsdc!);
        refillInfo = { signature: result.signature, calls: decision.refillCalls! };
      }
      chosen = kuotaReq!;
    } else {
      chosen = usdcReq!;
      budget.record(decision.costUsdc);
    }

    options.onDecision?.({ option: decision.option, reason: decision.reason, ...summary, refill: refillInfo });
    return pay(required, chosen, retry);
  };

  async function pay(required: PaymentRequired, chosen: PaymentRequirements, retry: Request) {
    const payload = await http.createPaymentPayload({ ...required, accepts: [chosen] });
    for (const [name, value] of Object.entries(http.encodePaymentSignatureHeader(payload))) retry.headers.set(name, value);
    return doFetch(retry);
  }
}
