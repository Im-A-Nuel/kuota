/**
 * Market price of 1 kuota in USDC base units, from the Kuota API.
 *
 * The API refreshes its snapshot every 30 seconds (docs/ARCHITECTURE.md), so this is a few
 * seconds stale at worst. Before graduation it is the curve price; after graduation the
 * backend reports the DAMM v2 pool price in the same field.
 */
export function quoteFromApi(apiUrl: string, mint: string, doFetch: typeof fetch = fetch): () => Promise<bigint | null> {
  const url = `${apiUrl.replace(/\/$/, "")}/kuota/${mint}`;
  return async () => {
    const res = await doFetch(url);
    if (!res.ok) return null;
    const body = (await res.json()) as { priceKuotaUsdc?: string };
    return body.priceKuotaUsdc ? toBaseUnits(body.priceKuotaUsdc) : null;
  };
}

/** "0.0061" to 6100n, without a floating point number in between. */
export function toBaseUnits(value: string): bigint {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) throw new Error(`"${value}" is not a decimal amount`);
  const [, whole, fraction = ""] = match;
  // More than 6 decimals cannot be represented; round up so a price is never understated.
  const padded = fraction.padEnd(6, "0");
  const base = BigInt(whole) * 1_000_000n + BigInt(padded.slice(0, 6));
  return padded.length > 6 && /[1-9]/.test(padded.slice(6)) ? base + 1n : base;
}
