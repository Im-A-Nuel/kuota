import {
  buildCurveWithCustomSqrtPrices,
  createSqrtPrices,
  getBaseTokenForSwap,
  getPriceFromSqrtPrice,
  validateConfigParameters,
  type ConfigParameters,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import Decimal from "decimal.js";
import {
  BASE_UNIT,
  CEILING_PRICE_BPS,
  DECIMALS,
  DEFAULTS,
  PLACEHOLDER_LEFTOVER_RECEIVER,
  PRICE_STEPS_BPS,
  SDK_ENUMS,
  START_PRICE_BPS,
} from "./constants";
import { LaunchConfigError } from "./errors";
import { curvePoints, type CurvePoint } from "./curve-points";

export interface LaunchInput {
  /** USDC a caller pays for one call today, for example "0.01". */
  usdcPricePerCall: string;
  /** Calls the provider commits to serve. Sets the fixed supply (whole tokens). */
  committedCalls: number;
  /** USDC raised on the curve before it graduates to DAMM v2. */
  migrationThresholdUsdc: number;
  /** Percent of the threshold paid to the creator as migration fee. Defaults to 30. */
  migrationFeePercent?: number;
  /**
   * Wallet that gets the leftover tokens after graduation, normally the provider.
   * Optional for simulation, where no wallet is connected yet and a placeholder is used.
   */
  leftoverReceiver?: string;
}

export interface LaunchPreview {
  curve: CurvePoint[];
  startPriceUsdc: string;
  endPriceUsdc: string;
  discountStartBps: number;
  discountEndBps: number;
  /** Tokens sold on the curve when it reaches the threshold (whole tokens). */
  callsSoldAtThreshold: number;
  /** Threshold the final config really reaches, in USDC. Within 0.1% of the request. */
  migrationThresholdUsdc: string;
  totalTokenSupply: number;
  /** Tokens returned to the provider after graduation. */
  leftoverTokens: number;
  warnings: string[];
}

export interface LaunchConfig {
  config: ConfigParameters;
  /** The provider wallet, or a placeholder in simulation. Pass it on to createConfig. */
  leftoverReceiver: PublicKey;
  preview: LaunchPreview;
}

type Prepared = { price: Decimal; threshold: Decimal; committed: number; feePercent: number };

function prepare(input: LaunchInput): Prepared {
  const fail = (message: string, details: Record<string, unknown> = {}) => {
    throw new LaunchConfigError("INVALID_PARAMS", message, details);
  };

  let price: Decimal;
  try {
    price = new Decimal(input.usdcPricePerCall);
  } catch {
    return fail("usdcPricePerCall must be a decimal number", { field: "usdcPricePerCall" });
  }
  if (!price.isFinite() || price.lte(0)) fail("usdcPricePerCall must be > 0", { field: "usdcPricePerCall" });
  // Below 10 base units per call the 50% start price would round to a handful of units.
  if (price.mul(BASE_UNIT).lt(10)) fail("usdcPricePerCall is too small to build a curve", { field: "usdcPricePerCall" });

  if (!Number.isInteger(input.committedCalls) || input.committedCalls <= 0)
    fail("committedCalls must be > 0", { field: "committedCalls" });
  if (!(input.migrationThresholdUsdc > 0) || !Number.isFinite(input.migrationThresholdUsdc))
    fail("migrationThresholdUsdc must be > 0", { field: "migrationThresholdUsdc" });

  const feePercent = input.migrationFeePercent ?? DEFAULTS.migrationFeePercent;
  if (!Number.isFinite(feePercent) || feePercent < 0 || feePercent > 99)
    fail("migrationFeePercent must be between 0 and 99", { field: "migrationFeePercent" });

  return {
    price,
    threshold: new Decimal(input.migrationThresholdUsdc),
    committed: input.committedCalls,
    feePercent,
  };
}

function buildOnce(p: Prepared, totalTokenSupply: number, leftover: number): ConfigParameters {
  const prices = PRICE_STEPS_BPS.map((bps) => p.price.mul(bps).div(10_000).toNumber());
  const sqrtPrices = createSqrtPrices(prices, DECIMALS, DECIMALS);

  return buildCurveWithCustomSqrtPrices({
    token: {
      tokenType: SDK_ENUMS.tokenType,
      tokenBaseDecimal: SDK_ENUMS.tokenDecimal,
      tokenQuoteDecimal: DECIMALS,
      tokenAuthorityOption: SDK_ENUMS.tokenAuthority,
      totalTokenSupply,
      leftover,
    },
    fee: {
      baseFeeParams: {
        baseFeeMode: SDK_ENUMS.baseFeeMode,
        feeSchedulerParam: {
          startingFeeBps: DEFAULTS.antiSnipe.startingFeeBps,
          endingFeeBps: DEFAULTS.antiSnipe.endingFeeBps,
          numberOfPeriod: DEFAULTS.antiSnipe.numberOfPeriod,
          totalDuration: DEFAULTS.antiSnipe.totalDurationSeconds,
        },
      },
      dynamicFeeEnabled: false,
      collectFeeMode: SDK_ENUMS.collectFeeMode,
      creatorTradingFeePercentage: DEFAULTS.creatorTradingFeePercent,
      poolCreationFee: 0,
      enableFirstSwapWithMinFee: false,
    },
    migration: {
      migrationOption: SDK_ENUMS.migrationOption,
      migrationFeeOption: SDK_ENUMS.migrationFeeOption,
      migrationFee: { feePercentage: p.feePercent, creatorFeePercentage: 100 },
      migratedPoolFee: {
        collectFeeMode: SDK_ENUMS.migratedCollectFeeMode,
        dynamicFee: SDK_ENUMS.dynamicFee,
        poolFeeBps: DEFAULTS.migratedPoolFeeBps,
        compoundingFeeBps: DEFAULTS.compoundingFeeBps,
      },
    },
    // All liquidity locked for good, claimable by the creator (docs/SCHEMA.md on-chain table).
    liquidityDistribution: {
      partnerPermanentLockedLiquidityPercentage: 0,
      partnerLiquidityPercentage: 0,
      creatorPermanentLockedLiquidityPercentage: 100,
      creatorLiquidityPercentage: 0,
    },
    lockedVesting: {
      totalLockedVestingAmount: 0,
      numberOfVestingPeriod: 0,
      cliffUnlockAmount: 0,
      totalVestingDuration: 0,
      cliffDurationFromMigrationTime: 0,
    },
    activationType: SDK_ENUMS.activationType,
    sqrtPrices,
  });
}

function measure(config: ConfigParameters) {
  const last = config.curve[config.curve.length - 1].sqrtPrice;
  const sold = getBaseTokenForSwap(config.sqrtStartPrice, last, config.curve);
  return {
    thresholdUsdc: new Decimal(config.migrationQuoteThreshold.toString()).div(BASE_UNIT),
    soldTokens: new Decimal(sold.toString()).div(BASE_UNIT),
  };
}

/** The last price on the curve, as basis points of the USDC price, read back from the config. */
export function endPriceShareBps(config: ConfigParameters, usdcPrice: string): number {
  const last = config.curve[config.curve.length - 1].sqrtPrice as BN;
  const end = getPriceFromSqrtPrice(last, SDK_ENUMS.tokenDecimal, DECIMALS);
  return end.div(new Decimal(usdcPrice)).mul(10_000).toNumber();
}

/**
 * FR-01: the last price on the curve must stay below 85% of the USDC price per call.
 * It reads the price back out of the built config, so it checks what the program will use
 * and not just what the builder was asked for.
 */
export function assertBelowCeiling(config: ConfigParameters, usdcPrice: string): void {
  const share = endPriceShareBps(config, usdcPrice);
  // One basis point of slack for the Q64 rounding.
  if (share > CEILING_PRICE_BPS + 1) {
    throw new LaunchConfigError(
      "CURVE_ABOVE_CEILING",
      `The last price is ${(share / 100).toFixed(2)}% of the USDC price, above the ${CEILING_PRICE_BPS / 100}% ceiling.`,
      { endBps: share },
    );
  }
}

const MAX_ITERATIONS = 6;
const TOLERANCE = 0.001;

/**
 * Turns provider inputs into a validated DBC config.
 *
 * Supply layout: committed calls are the tokens the provider promises. Part of them is sold on
 * the curve up to the threshold, the rest comes back as leftover. On top of that the pool
 * needs LP tokens for DAMM v2, so total supply is committed calls plus that LP allocation
 * (docs/ARCHITECTURE.md, "fixed supply equal to committed calls").
 *
 * The SDK derives the threshold from the supply and the prices, so supply is solved for the
 * requested threshold. The relation is linear, which makes a few probes enough.
 */
export function buildLaunchConfig(input: LaunchInput): LaunchConfig {
  const p = prepare(input);

  // Probe: a large round supply gives threshold and sold tokens per supply token.
  const PROBE_AVAILABLE = 1_000_000;
  const PROBE_LEFTOVER = 100_000;
  let probe: ConfigParameters;
  try {
    probe = buildOnce(p, PROBE_AVAILABLE + PROBE_LEFTOVER, PROBE_LEFTOVER);
  } catch (e) {
    throw new LaunchConfigError("INVALID_PARAMS", `SDK rejected the curve: ${(e as Error).message}`);
  }
  const m0 = measure(probe);
  const thresholdPerToken = m0.thresholdUsdc.div(PROBE_AVAILABLE);
  const soldPerToken = m0.soldTokens.div(PROBE_AVAILABLE);

  let available = p.threshold.div(thresholdPerToken);
  let config = probe;
  let leftover = 0;
  let total = 0;
  let measured = m0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const sold = soldPerToken.mul(available);
    if (sold.gt(p.committed)) {
      throw new LaunchConfigError(
        "INVALID_PARAMS",
        `The curve needs about ${sold.ceil().toString()} calls to reach the threshold, but only ${p.committed} are committed. Raise committedCalls or lower the threshold.`,
        { field: "committedCalls", callsNeeded: sold.ceil().toNumber() },
      );
    }
    leftover = Math.max(1, Math.floor(p.committed - sold.toNumber()));
    total = Math.ceil(available.toNumber()) + leftover;
    try {
      config = buildOnce(p, total, leftover);
    } catch (e) {
      throw new LaunchConfigError("INVALID_PARAMS", `SDK rejected the curve: ${(e as Error).message}`);
    }
    measured = measure(config);
    const error = measured.thresholdUsdc.sub(p.threshold).abs().div(p.threshold);
    if (error.lte(TOLERANCE)) break;
    available = available.mul(p.threshold.div(measured.thresholdUsdc));
  }

  assertBelowCeiling(config, p.price.toString());
  const ceiling = endPriceShareBps(config, p.price.toString());

  let leftoverReceiver: PublicKey;
  try {
    leftoverReceiver = new PublicKey(input.leftoverReceiver ?? PLACEHOLDER_LEFTOVER_RECEIVER);
  } catch {
    throw new LaunchConfigError("INVALID_PARAMS", "leftoverReceiver is not a valid public key", { field: "leftoverReceiver" });
  }

  try {
    validateConfigParameters({ ...config, leftoverReceiver });
  } catch (e) {
    throw new LaunchConfigError("INVALID_PARAMS", `SDK validation failed: ${(e as Error).message}`);
  }

  const curve = curvePoints(config);
  const startPrice = p.price.mul(START_PRICE_BPS).div(10_000);
  const endPrice = new Decimal(curve[curve.length - 1].priceUsdc);

  return {
    config,
    leftoverReceiver,
    preview: {
      curve,
      startPriceUsdc: startPrice.toString(),
      endPriceUsdc: endPrice.toString(),
      discountStartBps: 10_000 - START_PRICE_BPS,
      discountEndBps: Math.round(10_000 - ceiling),
      callsSoldAtThreshold: measured.soldTokens.round().toNumber(),
      migrationThresholdUsdc: measured.thresholdUsdc.toString(),
      totalTokenSupply: total,
      leftoverTokens: leftover,
      warnings: [],
    },
  };
}
