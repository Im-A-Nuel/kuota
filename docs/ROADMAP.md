# MVP Roadmap: Kuota

Terakhir diperbarui: 5 Oktober 2026

## MVP Definition

MVP selesai kalau satu siklus penuh terbukti di mainnet dengan link tx: penyedia launch kuota, pembeli membeli di curve, agent membayar API dengan kuota, kuota di-burn, pool graduation ke DAMM v2, dan agent membeli kuota lewat Jupiter.

## Timeline Overview

| Fase | Tanggal | Tujuan |
| --- | --- | --- |
| 0. De-risk | Sen 5 Okt | Bukti pembayaran x402 dengan mint SPL custom di devnet |
| 1. Foundation | Sel 6 Okt | Config builder, launch devnet, migrasi manual terverifikasi |
| 2. Core | Rab 7 sampai Kam 8 Okt | Middleware, client, API demo, launch mainnet, burn worker, halaman token |
| 3. Traction | Jum 9 Okt | Penyedia eksternal, graduation demo, jalur Jupiter |
| 4. Polish dan submit | Sab 10 sampai Sel 13 Okt | Test, README, video, submission |

Kuota dikerjakan paralel dengan Rem dan Sorot. Rabu 7 Oktober adalah hari berat Kuota, jadi Rem dan Sorot sengaja ringan di hari itu.

---

## Fase 0: De-risk
**Durasi**: 1 hari (Sen 5 Okt)
**Tujuan**: memastikan asumsi paling berisiko benar sebelum menulis kode lain

### Tasks
- [ ] Buat mint SPL uji di devnet, mint ke wallet agent uji
- [ ] Jalankan server x402 minimal dengan `accepts` berisi mint uji
- [ ] Bayar satu request dengan mint uji, pastikan settle on-chain
- [ ] Catat facilitator yang berhasil (CDP atau self-hosted)
- [ ] DM 5 penyedia x402 (template di SUBMISSION.md)
- [ ] Register Colosseum, DM Meteora soal syarat submission Colosseum

---

## Fase 1: Foundation
**Durasi**: 1 hari (Sel 6 Okt)
**Tujuan**: repo jalan, launch devnet sukses

### Tasks
- [ ] Setup monorepo pnpm, Next.js, Drizzle, vitest, CI
- [ ] `packages/core`: constants, curve builder, validasi config
- [ ] `POST /api/launch/simulate` dan `POST /api/launch/build`
- [ ] Launch kuota uji di devnet dengan threshold kecil
- [ ] Verifikasi migrasi manual ke DAMM v2 di devnet

---

## Fase 2: Core Features
**Durasi**: 2 hari (Rab 7 sampai Kam 8 Okt)
**Tujuan**: fitur inti jalan di mainnet

### Tasks
- [ ] `@kuota/x402` middleware
  - [ ] Dua opsi di `accepts`
  - [ ] Verifikasi dan settle lewat facilitator
  - [ ] Tolak signature yang sudah tercatat
- [ ] `kuota-fetch`
  - [ ] Routing biaya sesuai aturan di SCHEMA.md
  - [ ] Refill batch via quote DBC
  - [ ] Budget per jam + unit test "tidak pernah lebih mahal dari USDC"
- [ ] `apps/demo-api` live di mainnet
- [ ] **Rabu malam: launch kuota demo di mainnet**
- [ ] `apps/burn-worker`: indexer transfer masuk + burn via delegate + ledger
- [ ] Halaman `/k/[mint]` dan `/launch`
- [ ] Thread X pertama dengan link tx

---

## Fase 3: Traction
**Durasi**: 1 hari (Jum 9 Okt)
**Tujuan**: bukti pemakaian nyata dan siklus lengkap

### Tasks
- [ ] Onboarding penyedia eksternal yang membalas DM
- [ ] Ajak komunitas membeli kuota kecil dan mencoba demo agent
- [ ] Graduation kuota demo + catat tx migrasi
- [ ] Jalur beli pasca graduation via Jupiter di `kuota-fetch`
- [ ] Halaman `/providers`

---

## Fase 4: Polish dan Submit
**Durasi**: 4 hari (Sab 10 sampai Sel 13 Okt)
**Tujuan**: siap dinilai juri

### Tasks
- [ ] Sab 10: test suite, error handling, loading state, README dengan semua alamat mainnet
- [ ] Sab 10: P1 hanya kalau P0 sudah live (dashboard penyedia)
- [ ] Min 11: snapshot metrik traction, naskah pitch dan technical demo
- [ ] Sen 12: rekam video, submit Colosseum, isi form CertiK
- [ ] Sel 13 sebelum 13:59 WIB: submit Meteora DBC sidetrack

---

## Kill Criteria

- Rab 7 Okt malam: kalau pembayaran dengan mint kuota belum jalan end-to-end, ubah desain. Akses API tetap lewat x402 USDC, dan kuota ditukar di endpoint `redeem` khusus.
- Jum 9 Okt: kalau belum ada penyedia eksternal yang membalas, berhenti mengejar dan fokus ke kualitas demo dengan API sendiri. Wallet tim dilabeli.
- Sab 10 Okt: kalau P0 belum live di mainnet, P1 dibatalkan seluruhnya.

---

## Parking Lot (Post-MVP)

- Dashboard penyedia lengkap: klaim fee, top up allowance delegate, analitik
- MCP tool untuk agent
- Marketplace multi-penyedia dengan pencarian
- Settlement USDC yang dilaporkan middleware untuk metrik pendapatan penuh
- Program on-chain kecil untuk burn tanpa delegate (kandidat Adevar pre-audit)

---

## Definition of Done

- Fitur berjalan di mainnet, bukan hanya devnet
- Ada link tx di README untuk perilaku on-chain fitur itu
- Unit test lulus dan CI hijau
- Tidak ada secret di repo
- Tidak ada bug kritis yang diketahui di jalur demo
