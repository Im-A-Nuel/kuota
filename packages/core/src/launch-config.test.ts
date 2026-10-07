import { PublicKey } from "@solana/web3.js";
import {
  BaseFeeMode,
  CollectFeeMode,
  MigrationOption,
  TokenAuthorityOption,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { describe, expect, it } from "vitest";
import {
  assertBelowCeiling,
  buildLaunchConfig,
  CEILING_PRICE_BPS,
  LaunchConfigError,
  type LaunchInput,
} from "./index";

const DOCS_EXAMPLE: LaunchInput = {
  usdcPricePerCall: "0.01",
  committedCalls: 150_000,
  migrationThresholdUsdc: 750,
};

const SETS: LaunchInput[] = [
  DOCS_EXAMPLE,
  { usdcPricePerCall: "0.0005", committedCalls: 5_000_000, migrationThresholdUsdc: 200 },
  { usdcPricePerCall: "1.5", committedCalls: 2_000, migrationThresholdUsdc: 600 },
  { usdcPricePerCall: "0.01", committedCalls: 10_000, migrationThresholdUsdc: 50 },
  { usdcPricePerCall: "0.25", committedCalls: 40_000, migrationThresholdUsdc: 3_000, migrationFeePercent: 10 },
];

function errorOf(input: LaunchInput): LaunchConfigError | null {
  try {
    buildLaunchConfig(input);
  } catch (e) {
    expect(e).toBeInstanceOf(LaunchConfigError);
    return e as LaunchConfigError;
  }
  return null;
}

describe("buildLaunchConfig", () => {
  it.each(SETS)("keeps the last price under 85% of the USDC price (%o)", (input) => {
    const { config, preview } = buildLaunchConfig(input);
    expect(() => assertBelowCeiling(config, input.usdcPricePerCall)).not.toThrow();
    const last = Number(preview.curve.at(-1)!.priceUsdc);
    expect(last / Number(input.usdcPricePerCall)).toBeLessThanOrEqual(CEILING_PRICE_BPS / 10_000 + 0.0001);
  });

  it.each(SETS)("starts at half the USDC price (%o)", (input) => {
    const { preview } = buildLaunchConfig(input);
    expect(Number(preview.curve[0].priceUsdc) / Number(input.usdcPricePerCall)).toBeCloseTo(0.5, 6);
    expect(preview.discountStartBps).toBe(5000);
    expect(preview.discountEndBps).toBe(1500);
  });

  it.each(SETS)("reaches the requested threshold within 0.1% (%o)", (input) => {
    const { preview } = buildLaunchConfig(input);
    const got = Number(preview.migrationThresholdUsdc);
    expect(Math.abs(got - input.migrationThresholdUsdc) / input.migrationThresholdUsdc).toBeLessThan(0.001);
  });

  it.each(SETS)("splits committed calls into sold tokens and leftover (%o)", (input) => {
    const { preview } = buildLaunchConfig(input);
    // Rounding to whole tokens can move this by a couple of tokens, never more.
    expect(Math.abs(preview.callsSoldAtThreshold + preview.leftoverTokens - input.committedCalls)).toBeLessThanOrEqual(2);
    expect(preview.totalTokenSupply).toBeGreaterThan(input.committedCalls);
  });

  it("draws a curve that only rises and never sells more than committed", () => {
    const { preview } = buildLaunchConfig(DOCS_EXAMPLE);
    for (let i = 1; i < preview.curve.length; i++) {
      expect(preview.curve[i].supplySold).toBeGreaterThanOrEqual(preview.curve[i - 1].supplySold);
      expect(Number(preview.curve[i].priceUsdc)).toBeGreaterThanOrEqual(Number(preview.curve[i - 1].priceUsdc));
    }
    expect(preview.curve.at(-1)!.supplySold).toBeLessThanOrEqual(DOCS_EXAMPLE.committedCalls);
    // The curve's own total agrees with the figure the preview reports.
    expect(Math.abs(preview.curve.at(-1)!.supplySold - preview.callsSoldAtThreshold)).toBeLessThanOrEqual(1);
  });

  it("matches the product's launch terms", () => {
    const { config } = buildLaunchConfig(DOCS_EXAMPLE);
    expect(config.migrationOption).toBe(MigrationOption.MET_DAMM_V2);
    expect(config.collectFeeMode).toBe(CollectFeeMode.QuoteToken);
    expect(config.creatorTradingFeePercentage).toBe(50);
    expect(config.migrationFee).toEqual({ feePercentage: 30, creatorFeePercentage: 100 });
    expect(config.creatorPermanentLockedLiquidityPercentage).toBe(100);
    expect(config.tokenUpdateAuthority).toBe(TokenAuthorityOption.Immutable);
    expect(config.tokenDecimal).toBe(6);
    expect(config.poolFees.baseFee.baseFeeMode).toBe(BaseFeeMode.FeeSchedulerExponential);
    // Three flat segments, not one steep one.
    expect(config.curve).toHaveLength(3);
  });

  it("passes the real provider wallet through as leftover receiver", () => {
    const wallet = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU").toBase58();
    const { leftoverReceiver } = buildLaunchConfig({ ...DOCS_EXAMPLE, leftoverReceiver: wallet });
    expect(leftoverReceiver.toBase58()).toBe(wallet);
  });

  describe("rejects bad input with the codes from docs/SCHEMA.md", () => {
    it("zero, negative or non-numeric price", () => {
      for (const usdcPricePerCall of ["0", "-1", "abc"]) {
        expect(errorOf({ ...DOCS_EXAMPLE, usdcPricePerCall })?.code).toBe("INVALID_PARAMS");
      }
    });

    it("committed calls not a positive integer", () => {
      expect(errorOf({ ...DOCS_EXAMPLE, committedCalls: 0 })?.code).toBe("INVALID_PARAMS");
      expect(errorOf({ ...DOCS_EXAMPLE, committedCalls: 1.5 })?.code).toBe("INVALID_PARAMS");
    });

    it("threshold or migration fee out of range", () => {
      expect(errorOf({ ...DOCS_EXAMPLE, migrationThresholdUsdc: 0 })?.code).toBe("INVALID_PARAMS");
      expect(errorOf({ ...DOCS_EXAMPLE, migrationFeePercent: 100 })?.code).toBe("INVALID_PARAMS");
    });

    it("bad leftover receiver", () => {
      expect(errorOf({ ...DOCS_EXAMPLE, leftoverReceiver: "not-a-key" })?.code).toBe("INVALID_PARAMS");
    });

    it("committed calls too low for the threshold, and says how many are needed", () => {
      const error = errorOf({ ...DOCS_EXAMPLE, committedCalls: 50_000 });
      expect(error?.code).toBe("INVALID_PARAMS");
      expect(error?.details.callsNeeded).toBeGreaterThan(100_000);
    });
  });

  it("flags a config whose curve would end above the ceiling", () => {
    // Built for a 0.01 USDC call. Judged against a 0.005 call its last price (0.0085) is 170%
    // of it, which is what a bad curve looks like.
    const { config } = buildLaunchConfig(DOCS_EXAMPLE);
    expect(() => assertBelowCeiling(config, "0.005")).toThrowError(LaunchConfigError);
    try {
      assertBelowCeiling(config, "0.005");
    } catch (e) {
      expect((e as LaunchConfigError).code).toBe("CURVE_ABOVE_CEILING");
    }
  });
});
