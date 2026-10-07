import {
  getDeltaAmountBaseUnsigned,
  getPriceFromSqrtPrice,
  Rounding,
  type ConfigParameters,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import BN from "bn.js";
import Decimal from "decimal.js";
import { BASE_UNIT, DECIMALS, SDK_ENUMS } from "./constants";

export interface CurvePoint {
  /** Tokens sold so far, in whole tokens. */
  supplySold: number;
  /** USDC per kuota at that point. */
  priceUsdc: string;
}

const SAMPLES_PER_SEGMENT = 8;

/**
 * Samples the price against tokens sold along a config's curve.
 * Inside a segment price moves with sqrt price, so points are spaced evenly in sqrt price.
 * Token amounts come from the SDK's own delta function, so they match what the program does.
 */
export function curvePoints(config: ConfigParameters): CurvePoint[] {
  const points: CurvePoint[] = [];
  let lower = config.sqrtStartPrice as BN;
  let sold = new BN(0);

  // The Q64 math leaves long fractions; 12 places is far below one base unit of USDC.
  const priceOf = (sqrt: BN) =>
    getPriceFromSqrtPrice(sqrt, SDK_ENUMS.tokenDecimal, DECIMALS).toDecimalPlaces(12).toString();
  const push = (amount: BN, sqrt: BN) =>
    points.push({ supplySold: new Decimal(amount.toString()).div(BASE_UNIT).round().toNumber(), priceUsdc: priceOf(sqrt) });

  push(sold, lower);

  for (const segment of config.curve) {
    const upper = segment.sqrtPrice as BN;
    const liquidity = segment.liquidity as BN;
    const span = upper.sub(lower);
    for (let i = 1; i <= SAMPLES_PER_SEGMENT; i++) {
      const sqrt = i === SAMPLES_PER_SEGMENT ? upper : lower.add(span.muln(i).divn(SAMPLES_PER_SEGMENT));
      const inSegment = getDeltaAmountBaseUnsigned(lower, sqrt, liquidity, Rounding.Down);
      push(sold.add(inSegment), sqrt);
    }
    sold = sold.add(getDeltaAmountBaseUnsigned(lower, upper, liquidity, Rounding.Down));
    lower = upper;
  }

  return points;
}
