# @kuota/core

Turns a provider's inputs into a validated Meteora DBC config. No network access, no keys.

```ts
import { buildLaunchConfig } from "@kuota/core";

const { config, preview, leftoverReceiver } = buildLaunchConfig({
  usdcPricePerCall: "0.01",
  committedCalls: 150_000,
  migrationThresholdUsdc: 750,
  leftoverReceiver: providerWallet, // optional while simulating
});
```

- `config` is the SDK's `ConfigParameters`, already checked with `validateConfigParameters`. Pass it to `createConfig` together with `leftoverReceiver`.
- `preview` feeds the UI: curve points, discount at start and end, calls sold at graduation, total supply and leftover.
- Errors are `LaunchConfigError` with the codes from `docs/SCHEMA.md`: `INVALID_PARAMS` and `CURVE_ABOVE_CEILING`.

## How inputs map to the curve

| Product term | DBC setting |
| --- | --- |
| Price rises from 50% to 85% of the USDC price | Three constant-product segments, sqrt prices at 50%, 62%, 74% and 85% |
| Fixed supply equals committed calls plus LP allocation | `totalTokenSupply` is solved so the curve reaches the requested threshold; the part of the committed calls not sold on the curve is `leftover` and returns to the provider |
| No new tokens | Token authority is `Immutable` |
| Creator earns from minute one | `creatorTradingFeePercentage` 50, fees collected in USDC |
| Anti-snipe fee | Exponential scheduler, 5% down to 1% over 10 minutes |
| Capital at graduation | Migration fee 30% of the threshold, all to the creator |
| No liquidity rug | 100% of LP permanently locked, creator claims the fees |
| Market depth grows from volume | DAMM v2 pool, compounding fee mode |

## Assumptions to confirm

- `compoundingFeeBps` is 5000. The docs only say "compounding"; check the DAMM v2 docs for what the value means.
- The curve has three segments with equal liquidity weights, so it is not a straight line. At 0.01 USDC per call and a 750 USDC threshold it sells about 115k tokens, where the earlier linear estimate in `docs/SCHEMA.md` said about 111k.
- Devnet USDC is `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (Circle). Verify it before the first launch; DBC's quote-mint check runs on-chain.

## Commands

```bash
pnpm install
pnpm test
pnpm typecheck
```
