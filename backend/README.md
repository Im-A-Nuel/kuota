# @kuota/backend

HTTP API for launches and stats. TypeScript, Hono, Drizzle on Postgres. It holds no wallet keys: the provider signs in their own wallet, and the only secrets it creates are throwaway config and mint keypairs that sign one transaction each and are dropped.

```bash
cp .env.example .env     # set KUOTA_TREASURY to your public key
pnpm install
pnpm start               # http://localhost:8787
pnpm test
```

Without `DATABASE_URL` it runs an in-memory Postgres (PGlite), so a fresh checkout works. Migrations in `drizzle/` apply on start; after changing `src/db/schema.ts` run `pnpm db:generate`.

## Endpoints

Error bodies are `{ "error": { "code", "message", "details" } }` with the codes in `docs/SCHEMA.md`.

| Route | What it does |
| --- | --- |
| `GET /health` | Cluster and whether the treasury is set |
| `POST /launch/simulate` | Validated DBC config and the price curve for the given inputs. Body: `usdcPricePerCall`, `committedCalls`, `migrationThresholdUsdc`, optional `migrationFeeBps` (3000 = 30%) |
| `POST /launch/build` | Two partially signed transactions (`createConfig`, then `createPoolWithFirstBuy`) with the provider as fee payer. Rate limited to 20 per minute per client |
| `POST /launch/confirm` | After the provider signed and sent both: checks the chain against the build and records the launch. Safe to call twice |
| `GET /providers` | Launches, newest first |
| `GET /kuota/:mint` | Price, discount, progress, holders, burned, calls paid |
| `GET /kuota/:mint/burns?cursor=` | Burn ledger, 20 per page |
| `GET /kuota/:mint/settlements?cursor=` | Payments, with `isTeam` from `wallet_labels` |

## Not built yet

- The indexer that writes `settlements`, `snapshots` and `holders`. Until it runs, `/kuota/:mint` shows the opening price, 50% discount and 0% progress, and the ledgers are empty.
- The burn worker (`apps/burn-worker` in `docs/ARCHITECTURE.md`) and the demo API.
- `POST /settlements` (P1).

## Notes

- `pending_launches` is an addition to `docs/SCHEMA.md`: it keeps what a build produced so `/launch/confirm` can verify the transactions. Rows expire after 30 minutes.
- `firstBuy` uses `minimumAmountOut = 0`. That is safe because the pool does not exist until the same transaction creates it, so nobody can move the price in between.
- Builds were checked against the live devnet RPC: the SDK read the devnet USDC mint, which confirms the address in `@kuota/core`. No transaction was sent.
