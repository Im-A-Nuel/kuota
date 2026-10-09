# kuota-fetch

A drop-in `fetch` that pays x402 endpoints in whichever of USDC or kuota is cheaper.

```ts
import { createKuotaFetch, quoteFromApi } from "kuota-fetch";

const kuotaFetch = createKuotaFetch({
  signer,                            // the agent's wallet (a @solana/kit KeyPairSigner)
  rpcUrl,
  kuotaMint,
  budgetUsdcPerHour: 2,
  quote: quoteFromApi(apiUrl, kuotaMint),
  refill: buyKuotaOnCurve,           // optional: how to buy a batch with USDC
});

const res = await kuotaFetch("https://api.example/v1/quote"); // same call as fetch
```

On a 402 it applies the rule in `src/decide.ts`:

1. Hold enough kuota and it costs no more than the USDC price: pay with kuota.
2. Hold too little, buying is cheaper even after slippage, and the batch fits the hourly budget: buy a batch, then pay with kuota.
3. Otherwise pay USDC, if the budget allows. If not, the call is not paid and `KuotaFetchError` (`BUDGET`) is thrown.

`decide.test.ts` checks, over 20,000 random situations, that a payment never costs more than the USDC option and never exceeds the budget.

The agent must allow the kuota mint explicitly: x402 clients refuse unknown assets by default. `createKuotaFetch` does this with a per-payment cap (`maxKuotaPerCall`, default 1 kuota), which doubles as protection against an endpoint asking for more. See `docs/PHASE0.md`.
