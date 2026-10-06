# Database and API Design: Kuota

Last updated: Oct 5, 2026

All token amounts are stored as `bigint` base units. USDC and kuota both use 6 decimals, so `1_000_000` equals 1 USDC or 1 kuota (1 call).

## Database Schema

### launches
| Field | Type | Constraint | Description |
| --- | --- | --- | --- |
| id | uuid | PRIMARY KEY | |
| mint | text | UNIQUE NOT NULL | Kuota token mint |
| config | text | NOT NULL | DBC config account |
| pool | text | NOT NULL | DBC virtual pool |
| damm_pool | text | NULL | DAMM v2 pool after graduation |
| provider_pubkey | text | NOT NULL | Creator and fee receiver |
| name | text | NOT NULL | Token name |
| symbol | text | NOT NULL | Token symbol |
| endpoint_url | text | NOT NULL | x402 endpoint that accepts this kuota |
| usdc_price | bigint | NOT NULL | USDC per call, base units (10000 = 0.01 USDC) |
| committed_calls | bigint | NOT NULL | Fixed supply in whole tokens |
| migration_threshold | bigint | NOT NULL | Quote threshold, USDC base units |
| migration_fee_bps | int | NOT NULL | Migration fee in basis points |
| status | text | CHECK in ('curve','graduated') | |
| created_at | timestamptz | DEFAULT now() | |
| graduated_at | timestamptz | NULL | |

### settlements
| Field | Type | Constraint | Description |
| --- | --- | --- | --- |
| id | uuid | PRIMARY KEY | |
| signature | text | UNIQUE NOT NULL | Settlement tx signature |
| launch_id | uuid | FK launches.id | |
| payer | text | NOT NULL | Agent wallet |
| asset | text | CHECK in ('kuota','usdc') | |
| amount | bigint | NOT NULL | Base units |
| source | text | CHECK in ('chain','middleware') | `chain` = indexed from provider ATA, `middleware` = reported |
| slot | bigint | NOT NULL | |
| created_at | timestamptz | DEFAULT now() | |

### burns
| Field | Type | Constraint | Description |
| --- | --- | --- | --- |
| id | uuid | PRIMARY KEY | |
| signature | text | UNIQUE NOT NULL | Burn tx signature |
| launch_id | uuid | FK launches.id | |
| amount | bigint | NOT NULL | Base units burned |
| slot | bigint | NOT NULL | |
| created_at | timestamptz | DEFAULT now() | |

### snapshots
| Field | Type | Constraint | Description |
| --- | --- | --- | --- |
| id | uuid | PRIMARY KEY | |
| launch_id | uuid | FK launches.id | |
| price_kuota | bigint | NOT NULL | USDC base units per 1 kuota |
| discount_bps | int | NOT NULL | `(1 - price_kuota / usdc_price) * 10000` |
| curve_progress_bps | int | NOT NULL | Quote reserve vs threshold |
| holders | int | NOT NULL | Non-zero token accounts |
| burned | bigint | NOT NULL | Cumulative |
| calls_paid | bigint | NOT NULL | Count of kuota settlements |
| taken_at | timestamptz | DEFAULT now() | |

### wallet_labels
| Field | Type | Constraint | Description |
| --- | --- | --- | --- |
| pubkey | text | PRIMARY KEY | |
| label | text | NOT NULL | e.g. "builder", "demo agent" |
| is_team | boolean | NOT NULL | Excluded from non-team traction counts |

### Relationships
`launches 1 -- n settlements`, `launches 1 -- n burns`, `launches 1 -- n snapshots`. `wallet_labels` joins on `settlements.payer` for traction counts.

### Accounting identity (checked by a test on every snapshot)
```
circulating = committed_supply - burned - balance_in_curve_or_pool
```

---

## API Design

### Base URL
`https://kuota.<domain>/api`

### Authentication
Public read endpoints need no auth. Launch endpoints need no auth because they only return unsigned transactions. `POST /settlements` (P1) requires `Authorization: Bearer <launch report key>`.

### Launch

**POST /launch/simulate**
- Description: compute DBC config parameters and the price curve.
- Request body:
```json
{ "usdcPricePerCall": "0.01", "committedCalls": 150000, "migrationThresholdUsdc": 750, "migrationFeeBps": 3000 }
```
- Response:
```json
{
  "config": { "...": "SDK ConfigParameters, validated" },
  "curve": [{ "supplySold": 0, "priceUsdc": "0.005" }, { "supplySold": 111000, "priceUsdc": "0.0085" }],
  "discountStartBps": 5000,
  "discountEndBps": 1500,
  "warnings": []
}
```
- Errors: `INVALID_PARAMS`, `CURVE_ABOVE_CEILING`

**POST /launch/build**
- Description: build unsigned `createConfig` and `createPoolWithFirstBuy` transactions.
- Request body: simulate payload plus `{ "providerPubkey": "...", "name": "...", "symbol": "...", "uri": "...", "endpointUrl": "...", "firstBuyUsdc": 1 }`
- Response: `{ "transactions": ["<base64>", "<base64>"], "mint": "...", "config": "...", "pool": "..." }`
- Errors: `INVALID_PARAMS`, `RPC_ERROR`

**POST /launch/confirm**
- Description: record a launch after the provider signed and sent both transactions.
- Request body: `{ "mint": "...", "signatures": ["...", "..."] }`
- Response: `{ "launchId": "uuid" }`
- Errors: `TX_NOT_FOUND`, `MISMATCH`

### Stats

**GET /kuota/:mint**
- Response:
```json
{
  "mint": "...", "symbol": "KUOTA-DEMO", "status": "curve",
  "priceKuotaUsdc": "0.0061", "usdcPrice": "0.01", "discountBps": 3900,
  "curveProgressBps": 2400, "holders": 23, "burned": "412000000", "callsPaid": 412,
  "endpointUrl": "https://..."
}
```

**GET /kuota/:mint/burns?cursor=**
- Response: `{ "items": [{ "signature": "...", "amount": "100000000", "slot": 0, "createdAt": "..." }], "nextCursor": null }`

**GET /kuota/:mint/settlements?cursor=**
- Response: same shape as burns with `payer`, `asset`, `isTeam`.

**GET /providers**
- Response: `{ "items": [{ "mint": "...", "name": "...", "endpointUrl": "...", "status": "curve" }] }`

### Error Response Format
```json
{ "error": { "code": "INVALID_PARAMS", "message": "committedCalls must be > 0", "details": {} } }
```
Codes: `INVALID_PARAMS`, `CURVE_ABOVE_CEILING`, `RPC_ERROR`, `TX_NOT_FOUND`, `MISMATCH`, `NOT_FOUND`, `RATE_LIMITED`.

---

## Package Interfaces

### `@kuota/x402` (server)
```ts
export interface KuotaPaywallConfig {
  network: string;          // CAIP-2, e.g. "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
  payTo: string;            // provider wallet (owner of the USDC and kuota ATAs)
  usdcPrice: string;        // "0.01"
  kuotaMint: string;
  callsPerToken?: number;   // default 1
  facilitatorUrl: string;
  description?: string;
}
export function kuotaPaywall(config: KuotaPaywallConfig): import("express").RequestHandler;
```

Example 402 body (field names follow x402 V2 types, verify against the installed SDK):
```json
{
  "x402Version": 2,
  "accepts": [
    { "scheme": "exact", "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      "asset": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "amount": "10000", "payTo": "<provider>" },
    { "scheme": "exact", "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      "asset": "<KUOTA_MINT>", "amount": "1000000", "payTo": "<provider>" }
  ]
}
```
The provider's kuota ATA must exist before launch: the exact scheme does not create ATAs inside the payment transaction.

### `kuota-fetch` (client)
```ts
export interface KuotaFetchOptions {
  signer: import("@solana/web3.js").Keypair;
  connection: import("@solana/web3.js").Connection;
  budgetUsdcPerHour: number;
  refillBatchCalls?: number;    // default 100
  slippageBps?: number;         // default 100
  onDecision?: (d: PaymentDecision) => void;
}
export interface PaymentDecision {
  option: "usdc" | "kuota";
  reason: "balance" | "refilled" | "usdc-cheaper" | "budget";
  kuotaPriceUsdc: string;
  usdcPrice: string;
  refill?: { signature: string; calls: number };
}
export function createKuotaFetch(opts: KuotaFetchOptions): typeof fetch;
```

Decision rule:
```
p = quote price of 1 kuota in USDC (DBC quote before graduation, Jupiter after)
if balance >= 1 and p <= usdcPrice                      -> pay kuota
if balance < 1 and p * (1 + slippage) < usdcPrice
   and budgetLeft >= p * batch                          -> buy batch, pay kuota
otherwise                                               -> pay usdc
```

---

## On-chain Configuration (DBC)

| Parameter | Value | Product reason |
| --- | --- | --- |
| Quote mint | USDC | Discount comparable with the x402 USDC price |
| Supply | Fixed, equal to committed calls plus LP allocation | Auditable capacity promise |
| Token decimals | 6 | 1 token = 1 call |
| Curve | 2 to 3 nearly flat segments, 50% to 85% of the USDC price | Early discount, never above redemption value |
| Base fee | Exponential fee scheduler, 5% to 1% over 10 minutes | Anti-snipe at launch |
| Creator trading fee share | 50% | Provider revenue from minute one |
| Partner (fee claimer) | Kuota treasury | Platform revenue |
| Migration threshold | 750 USDC (provider kuota), about 50 USDC (demo kuota) | 750 USDC is auto-migrated by Meteora's keeper; demo is migrated manually |
| Migration fee | 30%, all to creator | Provider capital at graduation |
| Post-migration LP | 100% permanently locked (minimum 10% locked on day one) | No liquidity rug, LP fees still claimable |
| Migrated pool | DAMM v2, compounding collect-fee mode | Market depth grows from volume |
| Leftover receiver | Provider wallet | Unsold tokens return to provider |
| Token program | SPL Token | Compatibility |

Illustrative curve example (recomputed by `packages/core/src/curve.ts`): at 0.01 USDC per call, the curve moves from 0.005 to 0.0085 USDC and roughly 111k calls are sold before a 750 USDC threshold is reached.

SDK field names for these parameters differ between DBC SDK versions. Map them inside `packages/core/src/curve.ts` using the installed SDK's `buildCurve` or `buildCurveWithLiquidityWeights` helper and run `validateConfigParameters` before building any transaction.
