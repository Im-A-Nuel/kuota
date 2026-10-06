# Submission Kit: Kuota

Terakhir diperbarui: 5 Oktober 2026

Juri harus menemukan bukti mainnet dalam 30 detik pertama membuka repo. File ini berisi semua yang dibutuhkan untuk Colosseum, Meteora DBC sidetrack, dan CertiK.

## Deadlines

| Target | Deadline | Catatan |
| --- | --- | --- |
| Colosseum Crypto World's Fair | 12 Okt 2026 (cek jam pasti di dashboard Colosseum) | Satu produk per builder |
| Meteora DBC sidetrack | 13 Okt 2026, 13:59 WIB (06:59 UTC) | Superteam Earn |
| CertiK audit credits | 13 Okt 2026, 13:59 WIB | Hanya kalau Kuota adalah submission Colosseum |

## Proof links

Isi setelah setiap langkah terjadi di mainnet.

| Langkah | Tx / link |
| --- | --- |
| Launch config + pool | TODO |
| Pembelian pertama non-tim di curve | TODO |
| Pembayaran API dengan kuota | TODO |
| Burn pertama | TODO |
| Graduation ke DAMM v2 | TODO |
| Pembelian kuota via Jupiter | TODO |
| Penyedia eksternal live | TODO |

## Team wallets

| Wallet | Label |
| --- | --- |
| TODO | Builder (deployer, partner) |
| TODO | Demo agent |
| TODO | Burner (delegate, tanpa dana) |

## Checklist

### README
- [ ] Satu kalimat + link video demo di paling atas
- [ ] Tabel alamat mainnet terisi
- [ ] Proof links terisi
- [ ] Angka traction dengan link verifikasi, wallet tim dilabeli
- [ ] Quick start 5 langkah teruji di mesin bersih

### Colosseum
- [ ] Nama project, deskripsi singkat, latar belakang tim
- [ ] Repo GitHub publik
- [ ] Pitch video (maks. 3 menit)
- [ ] Technical demo video (maks. 3 menit)
- [ ] Narasi solo founder: pengalaman x402 dan agent payments di hackathon sebelumnya

### Meteora DBC sidetrack
- [ ] Link submission Colosseum (kalau disyaratkan)
- [ ] Penjelasan per parameter DBC (salin tabel dari SCHEMA.md)
- [ ] Repo publik, atau akses read untuk GitHub `dannxbt` kalau privat
- [ ] Metrik traction + proof links

### CertiK (opsional)
- [ ] Link Colosseum, repo, deskripsi
- [ ] Roadmap 6 sampai 12 bulan
- [ ] Status fundraising dan status full-time tim (jawab jujur)
- [ ] Kontak untuk scoping call

---

## Pitch video script (English, max 3 min)

**0:00 Hook.** "Every AI agent pays retail for every API call. Prepaid credits exist, but they are locked inside one vendor. Kuota makes API capacity liquid."

**0:15 Problem.** "x402 APIs get paid one call at a time. They have no upfront capital. Agents that call an API ten thousand times still pay the same price as everyone else, and unused credits are stuck."

**0:35 Insight.** "x402 on Solana accepts any SPL token as payment. So a token can be the credit itself. Meteora's bonding curve gives it price discovery and a path to permanent liquidity."

**0:55 Product.** "A provider launches a kuota token in under ten minutes. One token is one call. Early buyers get a discount. The provider's endpoint accepts USDC or one kuota. Every kuota used is burned, so burned supply equals calls served."

**1:30 Demo clip.** Launch page, curve, agent paying with kuota, burn ledger updating.

**2:00 Why it is not a meme.** "Kuota always redeems for a real call, and the curve never prices above that. After graduation the price is capped: if kuota costs more than USDC, agents just pay USDC."

**2:20 Business model and traction.** "Kuota is the partner on every launch and earns a share of trading fees. Today: TODO providers, TODO wallets, TODO calls paid with kuota, all on mainnet with links."

**2:45 Team and close.** "I am a solo builder who has shipped x402 and agent payment products across several hackathons. Kuota is prepaid capacity for the agent economy."

## Technical demo script (English, max 3 min)

1. **0:00** Repo tour: apps and packages, one sentence each.
2. **0:20** `/launch`: simulate a curve, show discount start and end, sign the launch in Phantom.
3. **0:50** Show the DBC config table and why each parameter exists.
4. **1:10** Run `demo-agent`: it receives a 402 with two options, compares prices, refills kuota on the curve, pays with kuota.
5. **1:50** Burn worker run: balance goes to zero, burn ledger row appears, explorer link.
6. **2:20** Graduation tx and a Jupiter buy from `kuota-fetch`.
7. **2:45** Accounting identity test passing.

## Meteora submission description (English)

> Kuota tokenizes API capacity on Meteora DBC. Each kuota token redeems for one call on an x402 API, so the asset has a fundamental anchor instead of a meme narrative. Fixed supply equals the capacity a provider commits to serve, the curve stays below the USDC per-call price, the migration fee funds the provider at graduation, Kuota earns partner fees on every launch, and the graduated DAMM v2 pool runs in compounding mode. Live on mainnet: TODO.

## DM template for x402 providers (English)

> Hi! I'm building Kuota for Colosseum: it lets your x402 API pre-sell capacity as a token on Meteora DBC. Heavy users buy calls at a discount, you earn creator trading fees from minute one plus capital at graduation. I handle the launch for free. Your endpoint only needs one extra entry in `accepts` for the kuota mint. Want to try it this week?

## Post komunitas (Indonesia)

> Lagi bikin Kuota buat Colosseum: kuota prabayar untuk API, kayak kuota internet tapi buat AI agent. Coba beli kuota 1 USD di [link], terus jalankan demo agent-nya. Semua transaksi on-chain dan bisa dicek. Feedback sangat membantu!

Catatan: kuota adalah kredit layanan, bukan investasi. Jangan menjanjikan kenaikan harga di postingan mana pun.
