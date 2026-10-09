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
