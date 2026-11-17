# PRODUCT REQUIREMENT DOCUMENT (PRD)

## Modul Permohonan Pengambilan Contoh Uji (Sampling) Online & Smart LIMS

**Sistem Informasi Manajemen Laboratorium Lingkungan Terintegrasi (ISO/IEC 17025\)**

**Versi:** 1.0

**Tanggal:** 17 November 2026

**Lingkup:** Self-Service Customer Portal, Dynamic Point & Matrix Selector, Auto-Regulation Parameter Binding, Feasibility Review (Kaji Ulang Permintaan ISO 17025), Automated Cost Estimation, & Smart Dispatch Routing.

## Ringkasan Eksekutif

**Smart LIMS Module: Online Sampling Request** adalah platform web self-service enterprise yang dirancang untuk merelokasi alur transaksi manual permohonan pengambilan contoh uji lingkungan menjadi terdigitalisasi penuh. Platform ini mengatasi inefisiensi pengisian formulir fisik di kantor laboratorium, meminimalisir kesalahan penentuan parameter uji baku mutu oleh pelanggan, serta mengotomatiskan penerbitan draf **Surat Penawaran Harga (SPH)** dan dokumen **Kaji Ulang Permintaan (Klausul ISO/IEC 17025:2017 7.1)**.

## 1\. Tujuan Aplikasi

### 1.1 Masalah yang Ingin Diselesaikan

* **Proses Manual & Inefisiensi Alur:** Pelanggan harus hadir secara fisik ke laboratorium untuk mengisi formulir kertas permohonan sampling, menentukan koordinat titik secara manual, dan berkonsultasi mengenai baku mutu.

* **Tinggi Resiko Errors (Human Error):** Transkripsi data parameter dari kertas ke LIMS internal sering menghasilkan ketidaksesuaian metode acuan SNI/Permen.

* **Ketersediaan Tim Lapangan Tidak Transparan:** Terjadi bentrok jadwal sampling akibat tidak adanya visibilitas kalender *real-time* atas kapasitas *Sampler* (petugas penganalisis lapangan) dan peralatan sampling (perangkat impinger, Hi-Vol, dll).

* **Lambatnya Penerbitan Surat Kaji Ulang & Penawaran:** Kaji ulang teknis fasilitas lab (kapasitas alat, personel, bahan habis pakai) membutuhkan koordinasi manual antar-subbag, memakan waktu 2–3 hari kerja.

### 1.2 Tujuan Utama Aplikasi & Nilai Bagi Pengguna

| Aspek | Nilai Bagi Pelanggan | Nilai Bagi Laboratorium |
| :---- | :---- | :---- |
| **Efisiensi Waktu** | Pengajuan sampling mandiri 24/7 dalam waktu \< 10 menit. | Pengurangan beban *front-office* hingga 85%. |
| **Akurasi Data** | Pemilihan Baku Mutu terintegrasi regulasi pemerintah secara presisi. | Validasi parameter dan metode uji otomatis berstandar SNI. |
| **Transparansi** | Kalender kuota sampling dan *tracking status* interaktif *real-time*. | Visibilitas *resource allocation* (personel & alat) secara tepat. |
| **Kepatuhan ISO 17025** | Draf Penawaran Harga (SPH) cepat & transparan. | Dokumen Kaji Ulang Kontrak otomatis ter-generate sesuai klausul audit. |

## 2\. Untuk Siapa Aplikasi Ini (Target Pengguna & Persona)

### 2.1 Persona Pengguna & Masalah Spesifik

1. **Pelanggan / HSE Officer Perusahaan (External User):**

   * *Kebiasaan:* Membutuhkan kepastian jadwal sampling berkala untuk pelaporan UKL-UPL / AMDAL ke Dinas Lingkungan Hidup.

   * *Masalah:* Kesulitan menghitung estimasi biaya awal dan tidak paham kode baku mutu yang tepat untuk jenis industrinya.

2. **Manajer Teknis / Supervisor Sampling (Internal User):**

   * *Kebiasaan:* Mengatur penugasan *Sampler* lapangan dan memastikan ketersediaan metode uji.

   * *Masalah:* Penjadwalan bertumpuk pada hari tertentu (*peak days*) dan sering kekurangan personel tersertifikasi BNSP.

3. **Lab Admin / Customer Service (Internal User):**

   * *Kebiasaan:* Verifikasi berkas permohonan dan menerbitkan invoice/SPH.

   * *Masalah:* Cek kelengkapan parameter manual membutuhkan pembukaan dokumen fisik regulasi yang memuat ratusan matriks.

4. **Pimpinan / Kepala Balai Laboratorium (Executive User):**

   * *Kebiasaan:* Membutuhkan rangkuman bisnis harian/bulanan.

   * *Masalah:* Tidak ada dashboard insight mengenai tren permintaan matriks uji dan utilisasi personel.

### 2.2 Hak Akses & Kewenangan (Role-Based Access Control)

```
[Pelanggan] ---> Buat Permohonan -> Pilih Baku Mutu -> Tracking -> Download SPH & Kaji Ulang
[Admin Lab] ---> Verifikasi Permohonan -> Atur Slot Kalender -> Generate SPH
[Manajer Teknis] -> Approval Kaji Ulang (Feasibility Assessment) -> Assign Sampler
[Pimpinan]  ---> View Analytical Dashboard & Revenue Metrics

```

## 3\. Apa yang Dihasilkan?

### 3.1 Output Utama Sistem

* **Dokumen Digital:** Draf Surat Penawaran Harga (PDF), Dokumen Kaji Ulang Permintaan (ISO 17025 Klausul 7.1 PDF), serta Surat Perintah Kerja Sampling (SPK).

* **Kode Tracking Unik:** Kode referensi interaktif (contoh: `SMP-202611-0042`) untuk pemantauan alur status *real-time*.

* **Smart Estimation Breakdowns:** Rincian biaya per titik, per parameter uji, biaya transportasi/akomodasi lokasi, serta PPN 11%.

* **Smart Recommendations:** Rekomendasi penetapan baku mutu dan rute sampling paling efisien berdasarkan klaster geografis.

## 4\. Fitur Utama

### 4.1 Fitur MVP (Versi 1.0 \- Wajib Ada)

1. **Self-Service Customer Portal & Authentication:** Login SSO, registrasi badan usaha, dan otomatisasi klaim data profil perusahaan.

2. **Interactive Fleet & Calendar Scheduler:** Kalender slot sampling interaktif dengan pembatas kapasitas tim (maksimal $N$ titik/hari).

3. **Dynamic Point & Matrix Engine:** Fitur penambahan titik sampling secara *unlimited* dengan input koordinat GPS / Google Maps picker.

4. **Auto-Regulation & Parameter Selector:** *Dropdown* regulasi (PP No. 22/2021, PermenLHK P.68/2016, dll) yang secara otomatis menandai parameter wajib beserta harga biayanya.

5. **Real-time Cost Estimator:** Kalkulator biaya aktual *client-side* secara instan.

6. **Admin Verification & Digital Contract Review:** Dasbor admin untuk mengecek ketersediaan personel & kaji ulang metode.

### 4.2 Fitur Tambahan (Fase 2 \- Future Enhancements)

1. **GIS Spatial Clustering:** Pengelompokan lokasi titik sampling antar-pelanggan terdekat dalam satu rute perjalanan petugas.

2. **Integrated Mobile Sampler App:** Modul lapangan untuk *digital chain of custody* (CoC) berbasis offline-first.

## 5\. Data & Sumber Data

### 5.1 Elemen Data yang Dibutuhkan

* **Data Pelanggan:** Nama Perusahaan, NIB/NPWP, Sektor Industri, Kontak HSE, Alamat & Titik Koordinat.

* **Data Regulasi & Parameter:** Database Baku Mutu Pemerintah, Daftar Parameter (BOD, COD, TSS, $\text{NO}_2$, $\text{SO}_2$, Noise, dll), Metode SNI, Limit Deteksi Alat, dan Tarif Resmi.

* **Data Operasional Lab:** Daftar Tim Sampler (Sertifikasi BNSP), Availability Alat Sampling, Slot Kalender Operasional.

### 5.2 Strategi Pengolahan Data

* **Data Sanitization:** Pembersihan data koordinat lokasi dan normalisasi karakter alamat perusahaan.

* **Indexing Parameter:** Pengindeksan *Full-Text Search* pada tabel parameter agar pencarian metode uji cepat ($< 50\text{ms}$).

## 6\. Model & Teknologi AI

### 6.1 Fungsi AI & Machine Learning

* **Smart Parameter Recommendation Engine:** Merekomendasikan parameter uji tambahan berdasarkan sektor industri (misal: Industri Tekstil otomatis merekomendasikan parameter *Krom Hexavalen* & *Zat Warna*).

* **Sampling Route & Schedule Optimization:** Algoritma pemeta rute tercepat (Traveling Salesperson Problem adaptation) untuk penghematan BBM kendaraan operasional lab.

* **Dynamic Capacity Forecasting:** Memprediksi beban puncak sampling bulanan berdasarkan riwayat tren historis 3 tahun terakhir.

### 6.2 Tech Stack AI & Analytics

* **Model Engine:** Python FastAPI, Scikit-learn (Regresi & Klustering), LangChain / OpenAI API (untuk ekstraksi data otomatis dari dokumen Regulasi PDF baru).

## 7\. Desain & Pengalaman Pengguna (UI/UX)

### 7.1 Prinsip Desain

* **Wizard Step-by-Step UI:** Menguraikan formulir rumit menjadi 5 langkah intuitif untuk mencegah beban kognitif (*cognitive overload*).

* **Mobile-First Responsive:** Memungkinkan tim HSE pelanggan melakukan pemesanan langsung dari tablet/smartphone di lokasi pabrik.

### 7.2 Halaman & Komponen Utama

1. **Landing Page & Authentication Hub:** Portal informasi tarif & status kuota sampling.

2. **Form Wizard Permohonan Sampling (Step 1-5):**

   * *Step 1:* Data Profil Perusahaan & PJ Teknis.

   * *Step 2:* Pilih Tanggal & Lokasi (Kalender Slots \+ Maps Integration).

   * *Step 3:* Konfigurasi Titik Sampling (Tambah/Hapus Titik Dinamis).

   * *Step 4:* Pemilihan Baku Mutu & Checklist Parameter.

   * *Step 5:* Ringkasan, Estimasi Biaya, & Submit.

3. **Dashboard Pelanggan:** Tabel daftar permohonan, indikator status *stepper*, dan tombol unduh SPH.

4. **Dashboard Admin & Kaji Ulang (ISO 17025):** Panel evaluasi kelayakan teknis lab & penerbitan dokumen resmi.

## 8\. Alur Operasional & Logika Prioritisasi

### 8.1 Alur Sistem End-to-End

```
[Pelanggan Fill Wizard Step 1-5] ---> [Calculates Cost & Checks Calendar Slot Availability]
                                                     │
                                                     ▼
[Submit Request] <--------------------- [Generate Tracking Code & SPH Draft]
       │
       ▼
[Admin Lab Review (Kaji Ulang ISO 17025)] ──► Fail? ──► [Reject / Request Revision to Customer]
       │
       ▼ Pass?
[Manajer Teknis Approve & Assign Sampler Team]
       │
       ▼
[System Generates Final SPH & SPK Sampling] ──► Status: "Ready for Execution"

```

## 9\. Infrastruktur & Development

### 9.1 Arsitektur Sistem

Arsitektur menggunakan pendekatan **Modern Monolith / Serverless Ready** berbasis Next.js App Router untuk kemudahan pemeliharaan dan skalabilitas tinggi.

```
[Browser / Mobile Client] 
           │ (HTTPS / REST / Server Actions)
           ▼
[Next.js 15 App Router Frontend & API] ──► [PostgreSQL + Supabase ORM]
           │                                          │
           ├─► [PDF Generator Engine (Puppeteer)]     ├─► [Redis Cache (Slots & Rates)]
           └─► [AI Recommendation Service (Python)]   └─► [S3 Storage (Docs & Photos)]

```

### 9.2 Stack Teknologi Terpilih

* **Frontend:** Next.js 15 (TypeScript), Tailwind CSS, Shadcn UI, React Hook Form, Zod.

* **Backend API:** Node.js Next.js Route Handlers / Server Actions.

* **Database:** PostgreSQL (Disimpan di Cloud Supabase) dengan Prisma ORM.

* **Cache & Queue:** Redis (Upstash) untuk *locking* slot kalender real-time.

## 10\. Pengembangan Aplikasi

### 10.1 Tahapan & Timeline Pengembangan (Sprint 6 Minggu)

* **Minggu 1 (System Architecture & Master Data):** Setup DB PostgreSQL, Prisma Schemas, Skema Auth, dan pencatatan Master Data Regulasi/Parameter.

* **Minggu 2 (Calendar Engine & Dynamic Point Form):** Pengerjaan komponen Wizard Step 1-3, integrasi Google Maps API, & *slot locking logic*.

* **Minggu 3 (Parameter Auto-Binding & Cost Engine):** Pengerjaan Wizard Step 4-5, logika pencocokan Baku Mutu, dan kalkulasi estimasi biaya.

* **Minggu 4 (Admin Panel & ISO 17025 Workflow):** Dashboard verifikasi admin, formulir kaji ulang permintaan, dan engine cetak PDF SPH/Dokumen.

* **Minggu 5 (AI Integration & Testing):** Rekomendasi parameter cerdas, UAT internal, dan pengujian beban performa.

* **Minggu 6 (Deployment & Hardening):** Penetration testing, migrasi data prod, dan rilis publik.

## 11\. Pengujian

### 11.1 Strategi Pengujian

* **Functional & Validation Testing:** Memastikan validasi skema form (Zod) menolak input koordinat/parameter tidak sah.

* **ISO/IEC 17025 Auditability Test:** Memastikan dokumen Kaji Ulang Permintaan merekam identitas peninjau, tanggal, dan catatan kelayakan teknis tanpa celah manipulasi.

* **Performance Testing:** Memastikan waktu muat kalender dan pencarian baku mutu di bawah $1.5$ detik pada beban $500$ pengguna simultan.

## 12\. Keamanan & Privasi

### 12.1 Keamanan Data & Proteksi Privasi

* **Data Enkripsi:** Enkripsi *Data-at-Rest* menggunakan AES-256 dan *Data-in-Transit* menggunakan TLS 1.3.

* **Role-Based Access Control (RBAC):** Pelanggan hanya dapat melihat data permohonan perusahaan milik sendiri (*Strict Tenant Isolation*).

* **Audit Trail Unalterable Log:** Setiap tindakan persetujuan kaji ulang oleh Manajer Teknis dicatat secara immutable pada tabel `audit_logs` untuk audit ISO 17025\.

## 13\. Persiapan Deployment

### 13.1 Lingkungan Deployment (Environments)

1. **Development:** Local Docker (Postgres, Redis).

2. **Staging:** Vercel Staging \+ Supabase Staging DB (Untuk UAT Internal).

3. **Production:** Vercel Enterprise \+ Managed Supabase Production DB \+ Cloudflare Web Application Firewall (WAF).

## 14\. Domain & Branding

* **Nama Produk:** **SmartLIMS \- Online Sampling Portal**

* **Tagline:** "Pengambilan Sampel Lingkungan Cepat, Presisi, dan Berstandar ISO/IEC 17025."

* **Arah Branding Visual:** Professional Corporate Clean (Dominan Deep Navy Blue `#0F172A`, aksen Emerald Green `#10B981` untuk indikator kelayakan/ISO, dan Cyan Blue `#06B6D4` untuk status transaksional).

## 15\. Publish & Launch

### 15.1 Checklist Peluncuran (Go-Live Checklist)

* \[x\] Schema DB Prod ter-migrate & ter-seed master regulasi pemerintah terbaru.

* \[x\] SSL/TLS Certificate aktif dan terverifikasi Grade A+ Qualys.

* \[x\] Integrasi generator PDF SPH & Kaji Ulang Permintaan berjalan presisi.

* \[x\] UAT ditandatangani oleh Manajer Teknis & Kepala Laboratorium.

* \[x\] Sistem backup basis data otomatis 6 jam sekali telah terkonfigurasi.

## 16\. Monitoring & Iterasi

### 16.1 Metrik Kinerja & Dashboard Pemantauan

* **Operational Metrics:** Rata-rata waktu pengajuan (Target: $<8$ menit), Persentase Kaji Ulang Terverifikasi dalam $<4$ jam.

* **System Metrics:** System Uptime $99.9\%$, API Response Time $<300\text{ms}$.

* **Business Impact Metrics:** Tingkat konversi Draf SPH menjadi SPK Sampling (Target: $>75\%$).

## Lampiran A. Functional Requirements

| ID | Requirement | Prioritas |
| :---- | :---- | :---- |
| **FR-01** | Pelanggan dapat mendaftar dan login SSO/Email. | Must Have |
| **FR-02** | Pelanggan dapat menentukan jumlah titik sampling secara dinamis pada form. | Must Have |
| **FR-03** | Sistem mencocokkan Baku Mutu dengan parameter wajib secara otomatis. | Must Have |
| **FR-04** | Sistem menghitung estimasi biaya otomatis sesuai tarif resmi. | Must Have |
| **FR-05** | Admin dapat mengelola slot ketersediaan kalender tim sampling. | Must Have |
| **FR-06** | Manajer Teknis dapat melakukan input formulir Kaji Ulang Permintaan (ISO 17025). | Must Have |
| **FR-07** | Sistem menerbitkan PDF Surat Penawaran Harga (SPH) dengan QR Validation. | Must Have |
| **FR-08** | Engine AI memberikan rekomendasi parameter berdasarkan sektor industri. | Should Have |

## Lampiran B. Non-Functional Requirements

| ID | Kategori | Requirements |
| :---- | :---- | :---- |
| **NFR-01** | Performa | Respon UI saat menambah titik sampling dinamis $< 100\text{ms}$. |
| **NFR-02** | Keamanan | Seluruh komunikasi API wajib terenkripsi TLS 1.3 & token JWT / Session. |
| **NFR-03** | Kepatuhan | Memenuhi klausul ISO/IEC 17025:2017 (Klausul 7.1 Kaji Ulang Permintaan). |
| **NFR-04** | Skalabilitas | Basis data mampu menangani hingga $1,000,000$ baris transaksi parameter. |

## Lampiran C. Data Model Awal (Schema Overview)

```
-- Tabel Utama Permohonan Sampling
CREATE TABLE sampling_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_code VARCHAR(50) UNIQUE NOT NULL,
    company_id UUID REFERENCES companies(id),
    scheduled_date DATE NOT NULL,
    total_estimated_cost DECIMAL(12,2) NOT NULL,
    status VARCHAR(30) DEFAULT 'SUBMITTED', -- SUBMITTED, VERIFIED, APPROVED, REJECTED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Titik Sampling Dinamis
CREATE TABLE sampling_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES sampling_requests(id) ON DELETE CASCADE,
    point_name VARCHAR(150) NOT NULL,
    matrix_type VARCHAR(50) NOT NULL, -- Air Limbah, Udara Ambien, Emisi, Air Bersih
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8)
);

-- Tabel Junction Parameter Per Titik
CREATE TABLE request_point_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sampling_point_id UUID REFERENCES sampling_points(id) ON DELETE CASCADE,
    parameter_id UUID REFERENCES parameters(id),
    custom_price DECIMAL(10,2) NOT NULL
);

```

## Lampiran D. Template Dashboard Management Brief (Pimpinan)

```
================================================================================
MANAGEMENT BRIEF: STATISTIK SAMPLING & KAJI ULANG PERMINTAAN LAB
================================================================================
Periode Operasional : 01 November 2026 - 17 November 2026

1. HIGHLIGHT TRANSAKSI:
   - Total Permohonan Masuk : 142 Permohonan
   - Disetujui (SPK Issued)  : 118 Permohonan (83%)
   - Pending Kaji Ulang      : 18 Permohonan
   - Ditolak (Kapasitas Lab) : 6 Permohonan

2. UTILISASI MATRIKS TERPOPULER:
   [1] Air Limbah Industri : 54% Total Titik
   [2] Udara Ambien        : 26% Total Titik
   [3] Emisi Cerobong      : 20% Total Titik

3. ESTIKASI REVENUE & EFFICIENCY:
   - Total Estimasi Nilai Kontrak : Rp 485.500.000,-
   - Rata-rata Waktu Verifikasi   : 1.8 Jam (Perbaikan 65% dari manual)
================================================================================

```

## Lampiran E. Prompt Lovable / v0.dev UI Generator

```
Buatkan antarmuka web modern dashboard untuk aplikasi Smart LIMS Modul Permohonan Pengambilan Contoh Uji (Sampling) Online.
Layout menggunakan Sidebar kiri dan Header area top.
Menu Utama: Dashboard, Buat Permohonan, Jadwal Kalender, Katalog Baku Mutu, Verification Center (Admin), Dokumen Kaji Ulang, & Analytics.

Di halaman "Buat Permohonan", tampilkan Multi-Step Wizard:
Step 1: Data Perusahaan & Penanggung Jawab.
Step 2: Pilih Tanggal Sampling (Kalender interaktif dengan indikator sisa kuota tim).
Step 3: Titik Sampling Dinamis (Card-based UI dengan tombol "+ Tambah Titik", input Nama Titik, Lokasi Maps, Dropdown Matriks Contoh Uji).
Step 4: Pemilihan Baku Mutu (Pilih Regulasi misal PermenLHK P.68/2016, yang otomatis memunculkan Checkbox Parameter Uji beserta Harga Satuan).
Step 5: Ringkasan & Total Estimasi Biaya (Rincian Biaya per Titik, PPN 11%, dan Tombol Submit).

Gunakan Tailwind CSS, warna tema Deep Slate Navy (#0F172A) untuk sidebar, aksen Cyan Blue (#06B6D4) untuk active state, dan Emerald Green (#10B981) untuk badge status ISO verified. Tampilan harus sangat bersih, enterprise-grade, dan responsive.

```

&nbsp;