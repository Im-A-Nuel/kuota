# kuota

Prepaid API calls as tokens. One kuota is one call on an x402 API, sold on a Meteora DBC curve and burned when spent.

## Layout

| Folder | Contents | Status |
| --- | --- | --- |
| `frontend/` | Next.js app: home, `/providers`, `/k/[mint]`, `/launch` | UI built on sample data |
| `backend/` | Launch and stats API, burn worker, demo API | not started |
| `packages/` | `core`, `x402-kuota`, `kuota-fetch` | not started |
| `docs/` | Requirements, architecture, schema, roadmap, submission kit | |

## Run the frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Without `NEXT_PUBLIC_API_URL` the UI runs on labelled sample data. Set it to the backend base URL to read real stats. Design direction and the reason behind each choice live in `frontend/DESIGN.md`.
