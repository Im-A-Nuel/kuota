import type { CurvePoint, LaunchParams, LaunchSimulation } from "./types";

/** The curve must end below this share of the USDC per-call price (docs/REQUIREMENTS.md FR-01). */
export const CEILING_BPS = 8500;
export const START_BPS = 5000;
const STEPS = 24;

/**
 * Client-side estimate for the launch preview. The linear shape from 50% to 85% of the USDC
 * price reproduces the example in docs/SCHEMA.md (about 111k calls at a 750 USDC threshold).
 * The real config is built and validated by the SDK on the backend.
 */
export function estimateCurve(params: LaunchParams): LaunchSimulation {
  const warnings: string[] = [];
  const price = Number(params.usdcPricePerCall);
  const { committedCalls, migrationThresholdUsdc: threshold } = params;

  if (!(price > 0) || !(committedCalls > 0) || !(threshold > 0)) {
    return {
      curve: [],
      discountStartBps: 0,
      discountEndBps: 0,
      callsSoldAtThreshold: 0,
      warnings,
    };
  }

  const start = (price * START_BPS) / 10000;
  const end = (price * CEILING_BPS) / 10000;
  const average = (start + end) / 2;
  const callsSoldAtThreshold = Math.round(threshold / average);

  if (callsSoldAtThreshold > committedCalls) {
    warnings.push(
      `The curve needs about ${callsSoldAtThreshold.toLocaleString("en-US")} calls to reach the threshold, but you commit ${committedCalls.toLocaleString("en-US")}. Raise committed calls or lower the threshold.`,
    );
  }

  const curve: CurvePoint[] = Array.from({ length: STEPS + 1 }, (_, i) => {
    const t = i / STEPS;
    return {
      supplySold: Math.round(callsSoldAtThreshold * t),
      priceUsdc: start + (end - start) * t,
    };
  });

  return {
    curve,
    discountStartBps: 10000 - START_BPS,
    discountEndBps: 10000 - CEILING_BPS,
    callsSoldAtThreshold,
    warnings,
  };
}

export interface LaunchFieldErrors {
  usdcPricePerCall?: string;
  committedCalls?: string;
  migrationThresholdUsdc?: string;
  migrationFeeBps?: string;
}

export function validateLaunchParams(params: LaunchParams): LaunchFieldErrors {
  const errors: LaunchFieldErrors = {};
  const price = Number(params.usdcPricePerCall);
  if (!(price > 0)) errors.usdcPricePerCall = "Enter a price above 0.";
  if (!Number.isInteger(params.committedCalls) || params.committedCalls <= 0)
    errors.committedCalls = "Enter a whole number above 0.";
  if (!(params.migrationThresholdUsdc > 0))
    errors.migrationThresholdUsdc = "Enter an amount above 0.";
  if (
    !Number.isInteger(params.migrationFeeBps) ||
    params.migrationFeeBps < 0 ||
    params.migrationFeeBps > 10000
  )
    errors.migrationFeeBps = "Enter a percentage from 0 to 100.";
  return errors;
}
