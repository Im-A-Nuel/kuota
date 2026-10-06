# System Architecture: Kuota

Last updated: Oct 5, 2026

## Overview

Kuota is a TypeScript monorepo with one web app, one long-running worker, two npm packages that providers and agents install, and a demo provider API. All money-moving signatures stay in provider and agent wallets. Kuota builds transactions and burns received tokens through an SPL delegate, nothing else.

## System Diagram

```
                +------------------+                        +-------------------+
                |  Provider (web)  |                        |  Agent            |
                |  launch, fees    |                        |  kuotaFetch       |
                +--------+---------+                        +----+---------+----+
                         |                                       |         |
                         v                             request+pay|         | buy kuota
   +---------------------+-------------------------+             v         v
   | Kuota services (TypeScript)                   |   +---------+--+   +--+-----------------+
   |                                               |   | Provider   |   | DBC curve (pre)    |
   |  apps/web          apps/web API   burn-worker |   | x402 API   |   | Jupiter (post)     |
   |  /launch /k/:mint  stats, launch  delegate    |   | @kuota/x402|   +--------------------+
   |        |                |             |       |   +-----+------+
   |        |            Postgres  <-------+       |         |
   +--------+------------------------------+-------+         | verify + settle
            | launch tx                    | burn            v
   +--------v------------------------------v-----------------+-------------------------+
   | Solana mainnet:  DBC program + DAMM v2   |   SPL Token (burn)   |  x402 facilitator  |
   +------------------------------------------------------------------------------------+
```

## Components

| Component | Responsibility | Runs on |
| --- | --- | --- |
| `apps/web` | Launch wizard, token pages, provider list, launch API, stats API | Vercel |
| `apps/burn-worker` | Every 10 min: read provider kuota ATAs, burn balances as delegate, write ledger | VPS |
| `apps/demo-api` | Baseline x402 API owned by the builder | VPS |
| `apps/demo-agent` | Script that calls APIs through `kuotaFetch` and prints cost vs USDC-only | Local |
| `packages/core` | Curve builder, config validation, constants, shared types | Library |
| `packages/x402-kuota` | Server middleware: adds kuota to `accepts`, verifies, settles, records | npm |
| `packages/kuota-fetch` | Client: cost routing, refill, budget cap | npm |

## Payment flow

```
Agent                 Provider API (@kuota/x402)        Facilitator          Solana
  |  GET /resource            |                              |                  |
  |-------------------------->|                              |                  |
  |  402 accepts[USDC, KUOTA] |                              |                  |
  |<--------------------------|                              |                  |
  |  compare prices, pick KUOTA (refill first if balance = 0)|                  |
  |  GET /resource + payment header (signed TransferChecked)  |                  |
  |-------------------------->|  verify + settle             |                  |
  |                           |----------------------------->|  submit tx       |
  |                           |                              |----------------->|
  |                           |  settled (signature)         |                  |
  |                           |<-----------------------------|                  |
  |  200 + resource           |  insert settlements row      |                  |
  |<--------------------------|                              |                  |
                                         burn-worker (every 10 min): burn ATA balance as delegate
```

## Tech Stack

### Frontend
- Framework: Next.js App Router
- Wallet: Solana wallet adapter (Phantom, Backpack)
- Styling: Tailwind CSS
- Charts: Recharts for curve and burn history

### Backend
- Runtime: Node.js 20, TypeScript
- API: Next.js route handlers
- Worker: plain Node process with a simple interval loop
- Validation: Zod on every request body

### Database
- Postgres (Neon or Supabase). Chosen because judges can re-run SQL against the ledger and Drizzle migrations are simple.

### Blockchain
- Network: Solana devnet for development, mainnet-beta for proof
- Programs: Meteora DBC, Meteora DAMM v2, SPL Token (classic)
- SDKs: Meteora DBC SDK, DAMM v2 SDK, `@solana/web3.js`, `@solana/spl-token`
- Payments: x402 V2, SVM exact scheme

### Infrastructure
- Hosting: Vercel for web; one small VPS for burn worker and demo API
- CI: GitHub Actions running lint, typecheck, vitest

## Key Design Decisions

- Decision: fixed supply equal to committed calls.
  - Reason: supply becomes an auditable promise of capacity.
  - Alternatives: dynamic supply. Rejected because it breaks the "1 token = 1 call you were promised" story.
- Decision: USDC quote token.
  - Reason: the discount against the x402 USDC price is directly comparable.
  - Alternatives: SOL quote. Rejected because price would move with SOL.
- Decision: curve ends at about 85% of the USDC per-call price.
  - Reason: early buyers always get a discount and the price has no room to exceed redemption value.
- Decision: Kuota is the DBC partner (fee claimer) on every config.
  - Reason: platform revenue from every launch, which answers the viability question.
- Decision: burn through an SPL delegate.
  - Reason: Kuota never holds provider keys. Note that an SPL delegate can both burn and transfer up to its allowance, so the allowance is kept small (about one day of expected calls) and topped up by the provider.
  - Alternatives: provider runs its own burn job. Kept as a documented option for providers who refuse delegation.
- Decision: classic SPL Token, not Token-2022.
  - Reason: widest compatibility with x402 clients, facilitators, and Jupiter.
- Decision: no custom on-chain program.
  - Reason: one week, solo. DBC and DAMM v2 already cover launch, liquidity, fees, and migration.
- Decision: DAMM v2 in compounding fee mode after graduation.
  - Reason: secondary market depth grows from volume without manual LP management.

## Security Considerations

| Threat | Mitigation |
| --- | --- |
| Leaked burner key | Burner holds no funds. Worst case: an attacker moves kuota up to the remaining delegate allowance, which only covers tokens received since the last burn run. Allowance stays small and providers can `revoke` at any time. |
| Malicious launch params | Server validates config with the SDK before building tx; provider reviews and signs in wallet. |
| Agent overspending | Hourly budget cap in `kuotaFetch`; refill batch size bounded. |
| Replayed payment header | Facilitator settlement is on-chain; middleware rejects already-recorded signatures. |
| Speculation narrative | Curve below redemption value, copy describes a service credit, no yield promises. |
| Secrets in repo | `.env` only, `.env.example` committed, CI secret scan. |

## Scalability Plan

- Stats API reads from Postgres snapshots refreshed every 30 seconds, not from RPC per request.
- Burn worker processes launches in batches; one burn tx per provider per run.
- If many providers join, split the worker by launch id hash and move to a queue.
