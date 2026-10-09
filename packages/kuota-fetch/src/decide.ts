// The routing rule from docs/SCHEMA.md, as a pure function so the "never pays more than
// the USDC option" promise (FR-04) can be tested without a network.
//
// All money is bigint base units (6 decimals) so nothing rounds through a double.

const ONE = 1_000_000n;
const BPS = 10_000n;

const ceilDiv = (a: bigint, b: bigint) => (a + b - 1n) / b;

export interface PaymentOptions {
  /** USDC base units one call costs, if the endpoint accepts USDC. */
  usdc?: { amount: bigint };
  /** Kuota base units one call costs, if the endpoint accepts this kuota. */
  kuota?: { amount: bigint };
}

export interface DecideInput {
  options: PaymentOptions;
  /** Kuota the agent holds, base units. */
  balance: bigint;
  /** USDC base units for 1 whole kuota right now (curve quote, or pool quote after graduation). Null when unknown. */
  marketPrice: bigint | null;
  /** Extra price movement tolerated when buying, in basis points. */
  slippageBps: number;
  /** Calls to buy in one refill. */
  refillBatchCalls: number;
  /** USDC base units still allowed to leave the wallet this hour. */
  budgetLeft: bigint;
}

export type Reason = "balance" | "refilled" | "usdc-cheaper" | "budget" | "no-kuota-option" | "no-quote" | "unaffordable";

export type Decision =
  | { option: "kuota"; reason: "balance" | "refilled"; refillCalls?: number; refillCostUsdc?: bigint }
  | { option: "usdc"; reason: "usdc-cheaper" | "no-kuota-option" | "no-quote" | "budget"; costUsdc: bigint }
  | { option: "none"; reason: "budget" | "unaffordable" };

/** USDC base units that `kuotaAmount` of kuota costs at `marketPrice`, rounded up. */
export const kuotaCostInUsdc = (kuotaAmount: bigint, marketPrice: bigint) => ceilDiv(kuotaAmount * marketPrice, ONE);

/**
 * Decision rule:
 *   hold enough kuota and it costs no more than USDC        -> pay with kuota
 *   hold too little, buying is cheaper even after slippage,
 *     and the batch fits the hourly budget                  -> buy a batch, then pay with kuota
 *   otherwise                                               -> pay with USDC, if the budget allows
 */
export function decide(input: DecideInput): Decision {
  const { options, balance, marketPrice, slippageBps, refillBatchCalls, budgetLeft } = input;
  const usdc = options.usdc?.amount;
  const kuota = options.kuota?.amount;

  const payUsdc = (reason: "usdc-cheaper" | "no-kuota-option" | "no-quote" | "budget"): Decision => {
    if (usdc === undefined) return { option: "none", reason: "unaffordable" };
    if (usdc > budgetLeft) return { option: "none", reason: "budget" };
    return { option: "usdc", reason, costUsdc: usdc };
  };

  if (kuota === undefined) return payUsdc("no-kuota-option");

  const perCall = marketPrice === null ? null : kuotaCostInUsdc(kuota, marketPrice);

  if (balance >= kuota) {
    // Without a quote there is nothing to compare, so kuota already held is spent: it is paid for.
    if (perCall === null || usdc === undefined || perCall <= usdc) return { option: "kuota", reason: "balance" };
    return payUsdc("usdc-cheaper");
  }

  if (perCall === null) return payUsdc("no-quote");
  if (usdc === undefined) {
    // Kuota is the only way to pay, so buying is the only way forward.
    return refill(kuota, marketPrice!, refillBatchCalls, budgetLeft);
  }

  const withSlippage = ceilDiv(perCall * (BPS + BigInt(slippageBps)), BPS);
  if (withSlippage >= usdc) return payUsdc("usdc-cheaper");

  const refilled = refill(kuota, marketPrice!, refillBatchCalls, budgetLeft);
  return refilled.option === "none" ? payUsdc("budget") : refilled;
}

function refill(kuota: bigint, marketPrice: bigint, calls: number, budgetLeft: bigint): Decision {
  const cost = kuotaCostInUsdc(kuota * BigInt(calls), marketPrice);
  if (cost > budgetLeft) return { option: "none", reason: "budget" };
  return { option: "kuota", reason: "refilled", refillCalls: calls, refillCostUsdc: cost };
}
