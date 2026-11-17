# SmartLIMS — Online Sampling Portal

Portal *self-service* permohonan pengambilan contoh uji lingkungan terintegrasi dan Kaji Ulang Permintaan berstandar **ISO/IEC 17025:2017 (Klausul 7.1)**.

Aplikasi ini menghubungkan **Pelanggan HSE Perusahaan** dengan tim internal laboratorium (**Admin Lab**, **Manajer Teknis**, dan **Kepala Balai**) mulai dari simulasi biaya pra-pengajuan, pemilihan titik koordinat GPS, pengikatan baku mutu SNI, pengelolaan kuota tim Sampler bersertifikat BNSP, hingga penerbitan dokumen PDF resmi dan jejak audit permanen.

---

## Fitur Utama

### 1. Halaman Utama (*Landing Page*)
- **Slide Judul & Akses Cepat**: Ringkasan nilai layanan standar ISO/IEC 17025:2017, tombol aksi utama menuju portal permohonan dan katalog baku mutu, serta metrik operasional utama.
- **Slide Simulasi Pengikatan Baku Mutu**: Visualisasi animasi reaksi labu Erlenmeyer SVG yang berubah warna secara dinamis sesuai matriks uji (*Air Limbah*, *Udara Ambien*, *Emisi Cerobong*, *Air Bersih*) dan merespons gerakan *scroll*, berdampingan dengan kalkulator estimasi tarif real-time (termasuk PPN 11%).
- **Bento Kapabilitas, Katalog Regulasi, & Alur RBAC**: Eksplorasi rekomendasi parameter per sektor industri, pratinjau kalender kuota harian, tabel metode acuan SNI & ambang baku mutu, alur operasional 4 tahap, serta ringkasan hak akses tiap peran.

### 2. Portal Pelanggan HSE Perusahaan
- **Autentikasi Fleksibel**: Mendukung login menggunakan **Email/Username & Kata Sandi**, **Google Sign-In**, lupa kata sandi, serta pendaftaran akun perusahaan baru.
- **Wizard Pengajuan 5 Langkah**:
  1. Profil perusahaan & penanggung jawab (NIB, sektor industri, alamat lokasi).
  2. Pemilihan tanggal sampling terintegrasi dengan kuota tim harian secara *real-time*.
  3. Penambahan titik sampling dinamis beserta koordinat GPS (`lat, lng`).
  4. Pengikatan regulasi baku mutu SNI dan parameter tambahan rekomendasi sektor.
  5. Tinjauan rincian biaya lab, biaya transportasi, PPN 11%, dan draf SPH sebelum kirim.
- **Revisi & Pelacakan Real-Time**: Pemantauan kode tracking (`SMP-YYYYMM-XXXX`), alur perbaikan jadwal/titik saat laboratorium mengirim permintaan **Revisi Jadwal**, dan pengiriman ulang permohonan.

### 3. Portal Internal Laboratorium (RBAC)
- **Verifikasi Admin Lab**: Validasi kelengkapan berkas permohonan, penguncian/pembukaan slot kalender, penyesuaian kapasitas harian, serta pembaruan catatan kesiapan alat lapangan.
- **Kaji Ulang Permintaan ISO/IEC 17025 (Manajer Teknis)**: Evaluasi kelayakan metode SNI, peralatan, bahan habis pakai, serta penugasan **Tim Sampler bersertifikat BNSP**.
- **Alur Revisi Jadwal**: Kemampuan meminta revisi jadwal atau titik sampling kepada pelanggan beserta alasan tercatat sebelum pengajuan diverifikasi ulang.
- **Tinjauan Eksekutif & Jejak Audit**: Ringkasan kinerja operasional untuk Kepala Balai dan pencatatan *append-only* pada koleksi `audit_logs`.

### 4. Generator Dokumen PDF & Ekspor Data
Seluruh dokumen dihasilkan langsung di sisi klien menggunakan `jsPDF` dan `jspdf-autotable` lengkap dengan kop surat dan QR verifikasi deterministik:
- **SPH (Surat Penawaran Harga)** — Draf & Final (`downloadSphPdf`)
- **Formulir Kaji Ulang Permintaan ISO/IEC 17025** (`downloadKajiUlangPdf`)
- **Surat Perintah Kerja (SPK) Sampling** (`downloadSpkPdf`)
- **Ringkasan Eksekutif / Manajemen** (`downloadManagementBriefPdf`)
- **Laporan Jejak Audit PDF** (`downloadAuditTrailPdf`)
- **Ekspor CSV** untuk data permohonan sampling dan log audit

---

## Tumpukan Teknologi

- **Frontend**: React 19, TypeScript, Vite 8
- **Styling & Animasi**: Tailwind CSS v4, Motion (`motion/react`), Lucide React
- **Dokumen & Ekspor**: `jspdf`, `jspdf-autotable`
- **Autentikasi & Database**: Firebase Authentication & Cloud Firestore
- **Hosting / Deployment**: Vercel (SPA configuration via `vercel.json`)

---

## Struktur Proyek

```text
├── firebase-applet-config.json   # Konfigurasi default proyek Firebase & database ID
├── firebase-blueprint.json       # Skema entitas & koleksi Firestore
├── firestore.rules               # Aturan keamanan Cloud Firestore berbasis peran (RBAC)
├── vercel.json                   # Konfigurasi build, rewrite SPA, & security headers Vercel
├── .env.example                  # Template variabel lingkungan
└── src/
    ├── App.tsx                   # State sesi pengguna & routing portal
    ├── components/
    │   ├── LandingPage.tsx       # Halaman utama (Slide Judul, Slide Simulasi, Katalog, Alur)
    │   ├── ErlenmeyerReaction.tsx# Animasi reaksi Erlenmeyer interaktif & scroll-linked
    │   ├── Navbar.tsx            # Bilah navigasi utama
    │   ├── LoginPage.tsx         # Halaman masuk & registrasi perusahaan
    │   ├── CustomerPortal.tsx    # Dashboard pelanggan, riwayat, & aksi revisi
    │   ├── CustomerWizard.tsx    # Wizard pengajuan & revisi sampling 5 langkah
    │   ├── AdminPortal.tsx       # Workspace Admin Lab, Manajer Teknis, & Kepala Balai
    │   └── DocumentModal.tsx     # Pratinjau dokumen & unduhan PDF
    ├── data/
    │   ├── limsPreviewData.ts    # Master regulasi baku mutu, sektor industri, & peran
    │   └── limsMockDatabase.ts   # Data referensi tim BNSP, status, & seed awal
    ├── lib/
    │   └── firebase.ts           # Inisialisasi Firebase App, Auth, & Firestore
    ├── services/
    │   ├── limsFirestore.ts      # Integrasi CRUD, real-time listener, & audit log Firestore
    │   └── pdfReports.ts         # Generator laporan PDF & CSV
    └── types/
        └── lims.ts               # Definisi tipe TypeScript SmartLIMS
```

---

## Menjalankan Secara Lokal

### Prasyarat
- **Node.js** `>= 20.0.0`
- **npm** (atau package manager yang kompatibel)
- Proyek Firebase dengan **Cloud Firestore** dan **Firebase Authentication** aktif

### Langkah Instalasi

1. **Clone repositori & masuk ke folder proyek**
   ```bash
   git clone <url-repositori-anda>
   cd <nama-folder-proyek>
   ```

2. **Install dependensi**
   ```bash
   npm install
   ```

3. **Konfigurasi variabel lingkungan (opsional jika menggunakan konfigurasi bawaan)**
   Salin `.env.example` menjadi `.env.local` bila ingin menimpa konfigurasi Firebase default:
   ```bash
   cp .env.example .env.local
   ```
   Isi nilai `VITE_FIREBASE_*` sesuai proyek Firebase Anda. Jika dikosongkan, aplikasi otomatis menggunakan `firebase-applet-config.json`.

4. **Jalankan server pengembangan (port 3000)**
   ```bash
   npm run dev
   ```
   Buka `http://localhost:3000` di browser.

### Perintah Tersedia

| Perintah | Deskripsi |
| --- | --- |
| `npm run dev` | Menjalankan Vite dev server di `http://localhost:3000` |
| `npm run build` | Membuild aplikasi produksi ke direktori `dist/` |
| `npm run preview` | Menjalankan pratinjau hasil build produksi secara lokal |
| `npm run lint` | Menjalankan pemeriksaan tipe TypeScript (`tsc --noEmit`) |

---

## Konfigurasi Firebase & Deploy ke Vercel

### 1. Pengaturan Firebase Console
1. **Authentication → Sign-in method**:
   - Aktifkan provider **Email/Password**.
   - Aktifkan provider **Google** (untuk login akun Pelanggan HSE).
2. **Authentication → Settings → Authorized domains**:
   - Tambahkan domain produksi Vercel Anda (misalnya `nama-proyek.vercel.app` atau custom domain).
3. **Cloud Firestore**:
   - Pastikan aturan keamanan pada `firestore.rules` telah di-deploy ke proyek Firebase Anda:
     ```bash
     firebase deploy --only firestore:rules
     ```

### 2. Deploy ke Vercel
Proyek ini sudah dilengkapi `vercel.json` (preset Vite, SPA fallback rewrite ke `/index.html`, serta header `Cross-Origin-Opener-Policy: same-origin-allow-popups` agar popup login Google berjalan lancar).

1. Push kode ke GitHub.
2. Buka [Vercel Dashboard](https://vercel.com), pilih **Add New → Project**, lalu impor repositori GitHub Anda.
3. Pastikan konfigurasi build terdeteksi otomatis:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. *(Opsional)* Tambahkan variabel lingkungan `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, dan `VITE_FIREBASE_DATABASE_ID` pada **Project Settings → Environment Variables**.
5. Klik **Deploy**.

---

## Catatan Keamanan

- Jangan pernah menyimpan file `.env*` pribadi atau kredensial sensitif di repositori GitHub (`.gitignore` sudah mengecualikan `.env*` kecuali `.env.example`).
- Hak akses baca/tulis data pada database dilindungi di sisi server melalui `firestore.rules`, termasuk isolasi data pelanggan per `ownerUid` dan sifat *append-only* pada `audit_logs`.
