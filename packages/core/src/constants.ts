import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  DammV2DynamicFeeMode,
  MigratedCollectFeeMode,
  MigrationFeeOption,
  MigrationOption,
  TokenAuthorityOption,
  TokenDecimal,
  TokenType,
} from "@meteora-ag/dynamic-bonding-curve-sdk";

/** USDC and kuota both use 6 decimals, so 1_000_000 base units is 1 token (docs/SCHEMA.md). */
export const DECIMALS = 6;
export const BASE_UNIT = 10 ** DECIMALS;

/** Circle USDC mints. The project runs on devnet only, see the project memory. */
export const USDC_MINT = {
  devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  "mainnet-beta": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
} as const;

/** Price steps as basis points of the USDC price per call: 50% start, 85% ceiling (FR-01). */
export const START_PRICE_BPS = 5000;
export const CEILING_PRICE_BPS = 8500;
/** Three nearly flat segments between start and ceiling (docs/SCHEMA.md, on-chain table). */
export const PRICE_STEPS_BPS = [START_PRICE_BPS, 6200, 7400, CEILING_PRICE_BPS] as const;

export const DEFAULTS = {
  /** Migration fee taken from the threshold, all paid to the creator. */
  migrationFeePercent: 30,
  creatorTradingFeePercent: 50,
  /** Exponential fee scheduler against sniping: 5% falling to 1% over 10 minutes. */
  antiSnipe: { startingFeeBps: 500, endingFeeBps: 100, numberOfPeriod: 10, totalDurationSeconds: 600 },
  /**
   * Share of DAMM v2 fees that compounds into the pool. ASSUMPTION: the docs only say
   * "compounding"; 5000 keeps half claimable. Confirm against Meteora's DAMM v2 docs.
   */
  compoundingFeeBps: 5000,
  migratedPoolFeeBps: 100,
} as const;

export const SDK_ENUMS = {
  activationType: ActivationType.Timestamp,
  baseFeeMode: BaseFeeMode.FeeSchedulerExponential,
  collectFeeMode: CollectFeeMode.QuoteToken,
  migratedCollectFeeMode: MigratedCollectFeeMode.Compounding,
  dynamicFee: DammV2DynamicFeeMode.Disabled,
  migrationOption: MigrationOption.MET_DAMM_V2,
  migrationFeeOption: MigrationFeeOption.Customizable,
  tokenType: TokenType.SPLToken,
  tokenDecimal: TokenDecimal.SIX,
  /** No mint authority: the supply is fixed. */
  tokenAuthority: TokenAuthorityOption.Immutable,
} as const;

/**
 * Stand-in leftover receiver for simulation. The SDK rejects the all-zero key, so a simulation
 * with no wallet uses this known program address. The build step always passes the real wallet.
 */
export const PLACEHOLDER_LEFTOVER_RECEIVER = "ComputeBudget111111111111111111111111111111";
