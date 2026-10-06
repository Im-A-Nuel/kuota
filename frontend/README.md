# kuota frontend

Next.js 16 (App Router), Tailwind CSS 4, Solana wallet adapter.

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build
pnpm lint
```

Environment variables (all optional):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Backend base URL, for example `https://kuota.example/api`. Unset means sample data. |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | `devnet` (default) or `mainnet-beta` |
| `NEXT_PUBLIC_SOLANA_RPC` | Custom RPC endpoint |

Where things live:

- `src/lib/api.ts`: the only place that talks to the backend, with a sample-data fallback.
- `src/lib/curve.ts`: client-side estimate used by the launch preview. The real config is built by the backend.
- `DESIGN.md`: design direction, palette, type and the reason for each choice.
