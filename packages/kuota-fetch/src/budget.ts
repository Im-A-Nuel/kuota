const HOUR_MS = 60 * 60 * 1000;

/**
 * Sliding one-hour window of USDC leaving the wallet (refills and direct USDC payments).
 * Payments made with kuota already held do not count: that money was spent earlier.
 */
export class HourlyBudget {
  private spent: { at: number; amount: bigint }[] = [];

  constructor(
    private readonly limit: bigint,
    private readonly now: () => number = Date.now,
  ) {}

  private prune() {
    const cutoff = this.now() - HOUR_MS;
    this.spent = this.spent.filter((s) => s.at > cutoff);
  }

  left(): bigint {
    this.prune();
    const used = this.spent.reduce((sum, s) => sum + s.amount, 0n);
    return used >= this.limit ? 0n : this.limit - used;
  }

  record(amount: bigint) {
    this.spent.push({ at: this.now(), amount });
  }
}
