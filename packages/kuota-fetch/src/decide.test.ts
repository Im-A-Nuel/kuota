import { describe, expect, it } from "vitest";
import { HourlyBudget } from "./budget";
import { decide, kuotaCostInUsdc, type DecideInput } from "./decide";
import { toBaseUnits } from "./quote";

const ONE = 1_000_000n;
const USDC_PRICE = 10_000n; // 0.01 USDC per call
const base: DecideInput = {
  options: { usdc: { amount: USDC_PRICE }, kuota: { amount: ONE } },
  balance: 0n,
  marketPrice: 6_100n, // 0.0061 USDC per kuota
  slippageBps: 100,
  refillBatchCalls: 100,
  budgetLeft: 5_000_000n, // 5 USDC
};
const withInput = (patch: Partial<DecideInput>): DecideInput => ({ ...base, ...patch });

describe("decide", () => {
  it("pays with kuota already held when it costs no more than USDC", () => {
    expect(decide(withInput({ balance: 5n * ONE }))).toEqual({ option: "kuota", reason: "balance" });
  });

  it("pays USDC when a held kuota is worth more than the USDC price", () => {
    const d = decide(withInput({ balance: 5n * ONE, marketPrice: 12_000n }));
    expect(d).toMatchObject({ option: "usdc", reason: "usdc-cheaper", costUsdc: USDC_PRICE });
  });

  it("buys a batch when out of kuota and buying is cheaper after slippage", () => {
    const d = decide(withInput({}));
    expect(d.option).toBe("kuota");
    expect(d).toMatchObject({ reason: "refilled", refillCalls: 100 });
    // 100 calls at 0.0061 each.
    expect((d as { refillCostUsdc: bigint }).refillCostUsdc).toBe(610_000n);
  });

  it("pays USDC when slippage would erase the saving", () => {
    // 0.00995 looks cheaper than 0.01, but with 1% slippage it could cost 0.01005: not worth it.
    expect(decide(withInput({ marketPrice: 9_950n, slippageBps: 100 }))).toMatchObject({
      option: "usdc",
      reason: "usdc-cheaper",
    });
    // 0.0099 with 1% slippage is at most 0.009999, still under 0.01: buying is fine.
    expect(decide(withInput({ marketPrice: 9_900n, slippageBps: 100 }))).toMatchObject({
      option: "kuota",
      reason: "refilled",
    });
  });

  it("pays USDC when the batch does not fit the hourly budget", () => {
    const d = decide(withInput({ budgetLeft: 500_000n })); // batch costs 0.61, only 0.5 left
    expect(d).toMatchObject({ option: "usdc", reason: "budget" });
  });

  it("refuses to pay when even one USDC call is over budget", () => {
    expect(decide(withInput({ budgetLeft: 5_000n }))).toEqual({ option: "none", reason: "budget" });
  });

  it("pays USDC when the market price is unknown and nothing is held", () => {
    expect(decide(withInput({ marketPrice: null }))).toMatchObject({ option: "usdc", reason: "no-quote" });
  });

  it("spends kuota already held when the market price is unknown", () => {
    expect(decide(withInput({ marketPrice: null, balance: ONE }))).toEqual({ option: "kuota", reason: "balance" });
  });

  it("pays USDC when the endpoint does not take kuota", () => {
    const d = decide(withInput({ options: { usdc: { amount: USDC_PRICE } } }));
    expect(d).toMatchObject({ option: "usdc", reason: "no-kuota-option" });
  });

  it("refills when kuota is the only option", () => {
    const d = decide(withInput({ options: { kuota: { amount: ONE } } }));
    expect(d).toMatchObject({ option: "kuota", reason: "refilled" });
  });

  it("cannot pay when the endpoint offers nothing usable", () => {
    expect(decide(withInput({ options: {} }))).toEqual({ option: "none", reason: "unaffordable" });
  });

  it("handles a kuota that buys several calls (price below one whole kuota)", () => {
    // One call costs 0.1 kuota = 0.00061 USDC at 0.0061, against 0.01 USDC.
    const d = decide(withInput({ options: { usdc: { amount: USDC_PRICE }, kuota: { amount: 100_000n } }, balance: 100_000n }));
    expect(d).toEqual({ option: "kuota", reason: "balance" });
  });
});

describe("FR-04: never pays more than the USDC option for one call", () => {
  // A small seeded generator keeps the cases reproducible without another dependency.
  let seed = 20261009;
  const rand = (max: number) => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return Math.floor((seed / 2 ** 32) * max);
  };

  it("holds for 20,000 random situations", () => {
    for (let i = 0; i < 20_000; i++) {
      const input: DecideInput = {
        options: {
          usdc: rand(5) === 0 ? undefined : { amount: BigInt(1 + rand(50_000)) },
          kuota: rand(5) === 0 ? undefined : { amount: BigInt(1 + rand(2_000_000)) },
        },
        balance: BigInt(rand(5_000_000)),
        marketPrice: rand(6) === 0 ? null : BigInt(1 + rand(40_000)),
        slippageBps: rand(500),
        refillBatchCalls: 1 + rand(300),
        budgetLeft: BigInt(rand(20_000_000)),
      };
      const d = decide(input);
      const usdc = input.options.usdc?.amount;
      const kuota = input.options.kuota?.amount;

      if (d.option === "usdc") {
        expect(usdc).toBeDefined();
        expect(d.costUsdc).toBeLessThanOrEqual(input.budgetLeft);
      }
      if (d.option === "kuota" && d.reason === "refilled") {
        // The purchase must beat the USDC price per call even after slippage, and fit the budget.
        const perCall = kuotaCostInUsdc(kuota!, input.marketPrice!);
        const withSlippage = (perCall * (10_000n + BigInt(input.slippageBps)) + 9_999n) / 10_000n;
        if (usdc !== undefined) expect(withSlippage).toBeLessThan(usdc);
        expect(d.refillCostUsdc!).toBeLessThanOrEqual(input.budgetLeft);
      }
      if (d.option === "kuota" && d.reason === "balance") {
        expect(input.balance).toBeGreaterThanOrEqual(kuota!);
        if (usdc !== undefined && input.marketPrice !== null) {
          expect(kuotaCostInUsdc(kuota!, input.marketPrice)).toBeLessThanOrEqual(usdc);
        }
      }
    }
  });
});

describe("HourlyBudget", () => {
  it("counts spend inside the last hour and forgets older spend", () => {
    let now = 1_000_000;
    const budget = new HourlyBudget(1_000_000n, () => now);
    expect(budget.left()).toBe(1_000_000n);
    budget.record(400_000n);
    now += 30 * 60_000;
    budget.record(500_000n);
    expect(budget.left()).toBe(100_000n);
    now += 31 * 60_000; // the first 0.4 is now over an hour old
    expect(budget.left()).toBe(500_000n);
  });

  it("never reports a negative amount", () => {
    const budget = new HourlyBudget(100n);
    budget.record(500n);
    expect(budget.left()).toBe(0n);
  });
});

describe("toBaseUnits", () => {
  it("converts decimals exactly", () => {
    expect(toBaseUnits("0.0061")).toBe(6_100n);
    expect(toBaseUnits("1")).toBe(1_000_000n);
    expect(toBaseUnits("0.01")).toBe(10_000n);
  });

  it("rounds up beyond 6 decimals so a price is never understated", () => {
    expect(toBaseUnits("0.0000011")).toBe(2n);
    expect(toBaseUnits("0.0000010")).toBe(1n);
  });

  it("rejects things that are not amounts", () => {
    expect(() => toBaseUnits("abc")).toThrow();
    expect(() => toBaseUnits("-1")).toThrow();
  });
});
