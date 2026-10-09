# @kuota/x402

Express middleware that lets an x402 endpoint be paid in USDC or in kuota.

```ts
import { kuotaPaywall, SOLANA_DEVNET } from "@kuota/x402";

app.use("/v1", kuotaPaywall({
  network: SOLANA_DEVNET,
  payTo: providerWallet,            // needs token accounts for the kuota mint and USDC
  usdcPrice: "0.01",                // one call, in USDC
  kuotaMint,                        // one call costs 1 kuota (change with callsPerToken)
  facilitatorUrl,                   // a facilitator that accepts this mint, see docs/PHASE0.md
  onSettled: (p) => record(p),      // optional: signature, payer, asset, amount
}));
```

The 402 response lists two options with the stock x402 V2 shape, so any x402 client can pay the USDC option unchanged. Verify and settle are delegated to the facilitator; this package adds the second price and the `onSettled` hook.

`pnpm test` runs 16 tests against a fake facilitator. `docs/PHASE0.md` has the on-chain proof.
