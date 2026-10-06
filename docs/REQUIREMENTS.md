# Requirements: Kuota

Terakhir diperbarui: 5 Oktober 2026

## Problem Statement

Penyedia API x402 baru menerima uang per call. Mereka tidak punya modal awal dan tidak bisa menjual kapasitas di muka tanpa membangun sistem kredit sendiri. Kredit prabayar yang sudah ada (ZAN, Vybe, Spraay) membuktikan ada permintaan untuk diskon prabayar, tapi saldonya terkunci di satu vendor: tidak bisa dijual lagi, tidak bisa di-route otomatis oleh agent, dan tidak punya price discovery.

Operator agent membayar harga eceran untuk setiap call. Kredit yang tidak terpakai menganggur. Kuota mengubah kapasitas API menjadi token SPL yang likuid, bisa ditebus satu banding satu dengan call, dan diperdagangkan di Meteora DBC lalu DAMM v2.

## Goals (In Scope)

- G-01: Satu siklus penuh berjalan di mainnet sebelum 13 Oktober 2026 13:59 WIB: launch, beli, bayar pakai kuota, burn, graduation, beli via Jupiter. Setiap langkah punya link tx.
- G-02: Minimal 1 penyedia x402 eksternal (bukan milik builder) live dengan kuota sendiri.
- G-03: Minimal 20 wallet pembeli non-tim dan minimal 200 call dibayar dengan kuota.
- G-04: Penyedia bisa launch kuota dalam waktu kurang dari 10 menit dari form.
- G-05: Developer agent cukup mengganti `fetch` dengan `kuotaFetch` untuk mulai memakai kuota.

## Non-Goals (Out of Scope)

- Program Anchor custom. Semua logika on-chain memakai program DBC, DAMM v2, dan SPL Token.
- Multi-chain atau EVM.
- Refund otomatis, model langganan, atau tier harga.
- Marketplace multi-penyedia dengan ranking, review, atau pencarian.
- Token-2022 dan transfer hook.
- Janji imbal hasil atau fitur yang membuat kuota terlihat seperti instrumen investasi.

## Functional Requirements

### FR-01: Simulasi launch
- Deskripsi: sistem harus menghitung parameter config DBC dari input penyedia dan menampilkan kurva harga.
- Input: harga USDC per call, jumlah call yang dijanjikan, migration threshold (USDC), persentase migration fee.
- Output: `ConfigParameters` tervalidasi, harga di setiap titik supply, diskon awal dan akhir terhadap harga USDC.
- Priority: High
- Selesai kalau: harga akhir curve selalu di bawah 85% harga USDC per call dan config lolos validasi SDK.

### FR-02: Build dan kirim transaksi launch
- Deskripsi: sistem harus menyusun transaksi `createConfig` (partner = Kuota) dan `createPoolWithFirstBuy` (creator = penyedia) yang ditandatangani di wallet penyedia.
- Input: hasil FR-01, public key penyedia, metadata token (nama, simbol, URI).
- Output: unsigned transaction base64, lalu alamat mint, config, dan pool setelah dikonfirmasi.
- Priority: High
- Selesai kalau: launch sukses di devnet lalu mainnet, data tersimpan di tabel `launches`.

### FR-03: Middleware x402 dengan dua opsi bayar
- Deskripsi: endpoint penyedia harus membalas 402 dengan dua opsi di `accepts`: USDC sesuai harga, atau 1 kuota.
- Input: request HTTP tanpa header pembayaran, atau dengan header pembayaran x402.
- Output: 402 dengan dua opsi, atau respons API setelah pembayaran terverifikasi dan settle.
- Priority: High
- Selesai kalau: pembayaran kuota settle on-chain sebagai `TransferChecked` mint kuota ke ATA penyedia, lalu respons dilayani, dan settlement tercatat di tabel `settlements`.

### FR-04: Routing biaya di client
- Deskripsi: `kuotaFetch` harus memilih opsi pembayaran termurah untuk setiap call.
- Input: respons 402, saldo kuota agent, harga kuota terkini (quote DBC sebelum graduation, quote Jupiter sesudahnya).
- Output: request ulang dengan header pembayaran opsi termurah.
- Priority: High
- Selesai kalau: `kuotaFetch` tidak pernah membayar lebih mahal dari opsi USDC untuk satu call, dibuktikan oleh unit test.

### FR-05: Isi ulang kuota otomatis
- Deskripsi: saat saldo kuota habis dan kuota lebih murah dari USDC, client harus membeli satu batch kuota.
- Input: ukuran batch (default 100 call), budget per jam.
- Output: transaksi swap USDC ke kuota, saldo kuota bertambah.
- Priority: High
- Selesai kalau: demo agent 500 call berjalan tanpa intervensi dan tidak melewati budget per jam.

### FR-06: Burn worker
- Deskripsi: sistem harus membakar kuota yang diterima penyedia secara berkala lewat delegate SPL.
- Input: daftar launch aktif, saldo ATA kuota penyedia, approval delegate untuk wallet burner.
- Output: transaksi burn dan baris di tabel `burns`.
- Priority: High
- Selesai kalau: setiap 10 menit saldo kuota penyedia kembali nol, dan selisih supply sama dengan total burn.

### FR-07: Burn ledger dan stats API
- Deskripsi: sistem harus menyediakan data publik per kuota.
- Output: progres curve, harga kuota, harga USDC, diskon, jumlah burned, jumlah holder, call terbayar, daftar burn dan settlement.
- Priority: High

### FR-08: Halaman token
- Deskripsi: halaman `/k/[mint]` harus menampilkan data FR-07 dan tombol beli kuota senilai 1 sampai 5 USD.
- Priority: High

### FR-09: Daftar penyedia
- Deskripsi: halaman `/providers` menampilkan semua kuota yang live beserta endpoint API-nya.
- Priority: Medium

### FR-10: Demo agent
- Deskripsi: skrip agent yang memanggil API demo memakai `kuotaFetch` dan mencetak perbandingan biaya terhadap baseline USDC-only.
- Priority: High

### FR-11: Dashboard penyedia (P1)
- Deskripsi: penyedia bisa melihat dan mengklaim creator trading fee, serta melihat migration fee setelah graduation.
- Priority: Medium

### FR-12: MCP tool (P1)
- Deskripsi: tool MCP supaya agent bisa mencari kuota, membeli, dan memanggil API.
- Priority: Low

## Non-Functional Requirements

- Performance: verifikasi dan settle pembayaran kuota di middleware selesai di bawah 3 detik untuk 95% request di mainnet.
- Performance: halaman token tampil di bawah 2 detik dengan data dari cache maksimal 30 detik.
- Security: Kuota tidak pernah menyimpan private key penyedia atau agent. Wallet burner hanya punya hak delegate burn dan tidak menyimpan dana.
- Security: tidak ada secret di repo; semua lewat environment variable.
- Correctness: identitas akuntansi `circulating = supply - burned - saldo di curve atau pool` harus terpenuhi di setiap snapshot.
- Reliability: burn worker harus melanjutkan dari tx terakhir setelah restart tanpa burn ganda.
- Transparency: setiap angka traction di README harus punya link tx atau query yang bisa diulang.

## Constraints

- Solo builder, dikerjakan paralel dengan dua project lain (Rem dan Sorot).
- Deadline Colosseum 12 Oktober 2026, deadline sidetrack Meteora 13 Oktober 2026 13:59 WIB.
- Mainnet wajib untuk bukti traction; dana uji kecil.
- Colosseum hanya menerima satu produk per builder.

## Assumptions

- x402 V2 di Solana menerima mint SPL apa pun sebagai `asset` (diuji di Fase 0).
- Facilitator yang dipakai memproses mint non-USDC. Kalau tidak, facilitator dijalankan sendiri.
- Pool DBC dengan threshold kecil bisa dimigrasi manual lewat SDK atau migrator UI Meteora.
- Token DBC otomatis masuk routing Jupiter.
- Penyedia eksternal bersedia menambah satu opsi `accepts` di endpoint mereka.
