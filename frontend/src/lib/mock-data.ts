// Sample data for UI work before the backend exists. Inputs come from the worked example in
// docs/SCHEMA.md; price and discount are derived from the same curve the chart draws, so the
// numbers agree across the page. Nothing here is on-chain: every row is labelled "sample".

import { priceAtProgress } from "./curve";
import type {
  BurnItem,
  KuotaStats,
  Page,
  ProviderItem,
  SettlementItem,
} from "./types";

export const SAMPLE_MINT = "sample";

const SAMPLE_USDC_PRICE = 0.01;
const SAMPLE_PROGRESS_BPS = 2400;
const samplePrice = priceAtProgress(SAMPLE_USDC_PRICE, SAMPLE_PROGRESS_BPS);

const sampleKuota: KuotaStats = {
  mint: SAMPLE_MINT,
  name: "Demo API calls",
  symbol: "KUOTA-DEMO",
  status: "curve",
  priceKuotaUsdc: samplePrice.toFixed(6),
  usdcPrice: String(SAMPLE_USDC_PRICE),
  discountBps: Math.round((1 - samplePrice / SAMPLE_USDC_PRICE) * 10000),
  curveProgressBps: SAMPLE_PROGRESS_BPS,
  committedCalls: 150000,
  holders: 23,
  burned: "412000000",
  callsPaid: 412,
  endpointUrl: "https://demo-api.example/v1/quote",
  dammPool: null,
  isSample: true,
};

const sampleBurns: BurnItem[] = [
  { id: "b3", signature: null, amount: "212000000", slot: null, createdAt: null },
  { id: "b2", signature: null, amount: "100000000", slot: null, createdAt: null },
  { id: "b1", signature: null, amount: "100000000", slot: null, createdAt: null },
];

const sampleSettlements: SettlementItem[] = [
  { id: "s5", signature: null, payer: null, asset: "kuota", amount: "1000000", isTeam: true, createdAt: null },
  { id: "s4", signature: null, payer: null, asset: "kuota", amount: "1000000", isTeam: false, createdAt: null },
  { id: "s3", signature: null, payer: null, asset: "usdc", amount: "10000", isTeam: false, createdAt: null },
  { id: "s2", signature: null, payer: null, asset: "kuota", amount: "1000000", isTeam: false, createdAt: null },
  { id: "s1", signature: null, payer: null, asset: "kuota", amount: "1000000", isTeam: true, createdAt: null },
];

export function mockGetKuota(mint: string): KuotaStats | null {
  return mint === SAMPLE_MINT ? sampleKuota : null;
}

export function mockListProviders(): ProviderItem[] {
  const { mint, name, symbol, endpointUrl, status, usdcPrice, discountBps, curveProgressBps } =
    sampleKuota;
  return [
    { mint, name, symbol, endpointUrl, status, usdcPrice, discountBps, curveProgressBps, isSample: true },
  ];
}

export function mockGetBurns(mint: string): Page<BurnItem> {
  return { items: mint === SAMPLE_MINT ? sampleBurns : [], nextCursor: null };
}

export function mockGetSettlements(mint: string): Page<SettlementItem> {
  return { items: mint === SAMPLE_MINT ? sampleSettlements : [], nextCursor: null };
}
