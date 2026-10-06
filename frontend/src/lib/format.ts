const UNIT = 1_000_000n;

/** Base units (6 decimals) to a whole-number of tokens. Fractions are dropped on purpose. */
export function wholeUnits(baseUnits: string): number {
  try {
    return Number(BigInt(baseUnits) / UNIT);
  } catch {
    return 0;
  }
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/** USDC prices per call are tiny, so keep up to 4 decimals but trim noise. */
export function formatUsdc(value: string | number, maxDecimals = 4): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
  }).format(n);
}

export function formatPercentFromBps(bps: number): string {
  return `${Math.round(bps / 100)}%`;
}

export function shortKey(key: string, head = 4, tail = 4): string {
  if (key.length <= head + tail + 1) return key;
  return `${key.slice(0, head)}...${key.slice(-tail)}`;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function explorerTx(signature: string): string {
  return `https://solscan.io/tx/${signature}`;
}
