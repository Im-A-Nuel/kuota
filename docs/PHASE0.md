# Phase 0 result: x402 with a custom SPL mint

Run on 2026-10-09, Solana devnet. Verdict: **the core assumption holds.** An x402 endpoint settled a payment in a mint that none of the x402 packages had seen before, and the chain confirms it.

## Evidence

| What | Value |
| --- | --- |
| Test kuota mint (6 decimals, classic SPL Token) | `CbVUx86UpNVjAPjTGRKF3HYdKDEh8tf4KwVRjWoL2hiw` |
| Settlement transaction | [`hEUjxayx…tmQU`](https://explorer.solana.com/tx/hEUjxayxMmuaQU8Ee7m3u4dxnnBYov3FpKsG3mTzCQ2fh58eAuwb9zimttjywWCGy83TmUjmNKkxzjH4HZtsmQU?cluster=devnet) |
| Instruction | `TransferChecked`, 1 kuota, agent token account to provider token account |
| Agent balance change | -1,000,000 base units |
| Provider balance change | +1,000,000 base units |
| Time from request to 200 | 1.6 s, including settlement (target in `REQUIREMENTS.md`: under 3 s at p95) |

The 402 response listed two options, USDC (`4zMMC9sr…`, 10000) and the test kuota (1000000), each with the facilitator as fee payer.

Reproduce: from `backend/`, run `scripts/phase0/1-keys.ts`, fund the facilitator address it prints with devnet SOL, then `2-setup.ts` and `3-run.ts`.

## What it means for the design

1. **No custom on-chain program or redeem endpoint is needed.** The kill-criteria fallback in `ROADMAP.md` does not apply.
2. **The facilitator has no mint allowlist.** `@x402/svm` checks only that the paid mint equals the mint in the requirements (`invalid_exact_svm_payload_mint_mismatch`). We ran our own facilitator, built from `@x402/svm`, so the provider pays no third party and the facilitator wallet only needs SOL for fees.
3. **The client must opt in to a custom mint.** x402 clients refuse every asset that is not a known default (USDC and a few others) and cap default assets at $1. The first run failed with "all payment requirements were filtered out" until the agent called `setSpendControls({ allowedAssets: [{ network, asset: mint, maxAmountPerPayment }] })`. `kuota-fetch` must set this, with the cap as the per-payment limit. It is also a built-in overspending guard.
4. **`registerPolicy` is the routing hook.** It runs after spend controls and receives the allowed options, so the "pay the cheaper option" rule from `docs/SCHEMA.md` fits there.
5. **Facilitator choice is now a product decision.** Providers need a facilitator that accepts their mint. Ours does; see "Not tested".

## Not tested

- **Third-party facilitators** (x402.org, CDP). They may restrict assets. Until checked, plan on the self-hosted facilitator.
- **Paying the USDC option.** No devnet USDC was available.
- **A missing provider token account.** The setup script creates it first, as `docs/SCHEMA.md` requires; the failure when it is absent was not exercised.
- **Replaying a payment header.** Not exercised here; `ARCHITECTURE.md` plans to record settled signatures in `settlements`.
- **Mainnet.** The whole project is on devnet by decision.

## Follow-up: running the packages on devnet (2026-10-09)

`backend/scripts/demo/agent.ts` runs the real packages end to end: our facilitator (`backend/src/facilitator.ts`), a demo provider on `@kuota/x402` (`backend/src/demo-api.ts`) and an agent on `kuota-fetch`. With 3 calls spaced 8 seconds apart, all 3 were served and settled on devnet, each paid with kuota from the agent's balance. At the stand-in market price of 0.0061 USDC the agent spent 0.0183 USDC-equivalent against a 0.0300 USDC baseline.

**Risk found: paid but not served.** A first run with no spacing hit the public devnet RPC rate limit (HTTP 429, roughly 10 requests per method per 10 seconds). Two calls returned 402 although their transfers had already landed on-chain: the facilitator sent the transaction, then failed to confirm it, so the API refused to serve a call the agent had paid for. 2 kuota were lost that way.

What to do about it:
- Use a dedicated devnet RPC endpoint for the facilitator (`SOLANA_RPC` in `backend/.env`). This is required for the demo, not optional.
- The demo agent now counts only served calls in its cost report and prints a warning when more kuota left the wallet than calls were served.
- Not solved: the facilitator and middleware do not yet reconcile a transaction that was sent but not confirmed. That needs a retry on the signature before answering 402, and it is the first thing to fix before any real traffic.
