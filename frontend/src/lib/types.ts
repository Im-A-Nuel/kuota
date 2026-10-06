// Shapes follow docs/SCHEMA.md. Token amounts travel as base-unit strings (6 decimals).

export type KuotaStatus = "curve" | "graduated";

export interface KuotaStats {
  mint: string;
  name: string;
  symbol: string;
  status: KuotaStatus;
  priceKuotaUsdc: string;
  usdcPrice: string;
  discountBps: number;
  curveProgressBps: number;
  committedCalls: number;
  holders: number;
  burned: string;
  callsPaid: number;
  endpointUrl: string;
  /** True while the data comes from the mock layer instead of the backend. */
  isSample: boolean;
}

export interface BurnItem {
  id: string;
  signature: string | null;
  amount: string;
  slot: number | null;
  createdAt: string | null;
}

export interface SettlementItem {
  id: string;
  signature: string | null;
  payer: string | null;
  asset: "kuota" | "usdc";
  amount: string;
  isTeam: boolean;
  createdAt: string | null;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ProviderItem {
  mint: string;
  name: string;
  symbol: string;
  endpointUrl: string;
  status: KuotaStatus;
  usdcPrice: string;
  discountBps: number;
  curveProgressBps: number;
  isSample: boolean;
}

export interface LaunchParams {
  usdcPricePerCall: string;
  committedCalls: number;
  migrationThresholdUsdc: number;
  migrationFeeBps: number;
}

export interface CurvePoint {
  supplySold: number;
  priceUsdc: number;
}

export interface LaunchSimulation {
  curve: CurvePoint[];
  discountStartBps: number;
  discountEndBps: number;
  callsSoldAtThreshold: number;
  warnings: string[];
}

export interface BuildLaunchInput extends LaunchParams {
  providerPubkey: string;
  name: string;
  symbol: string;
  uri: string;
  endpointUrl: string;
  firstBuyUsdc: number;
}

export interface BuildLaunchResult {
  transactions: string[];
  mint: string;
  config: string;
  pool: string;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
