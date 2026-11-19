# PRODUCT REQUIREMENT DOCUMENT (PRD)

## Modul Permohonan Pengambilan Contoh Uji (Sampling) Online & Smart LIMS

**Sistem Informasi Manajemen Laboratorium Lingkungan Terintegrasi (ISO/IEC 17025)**

**Versi:** 2.0 (Pembaruan Enterprise & Public Surface AI)  
**Tanggal:** 19 November 2026  
**Lingkup:** Self-Service Customer Portal, Dynamic Point & Matrix Selector, Auto-Regulation Parameter Binding, Feasibility Review (Kaji Ulang Permintaan ISO 17025), Automated Cost Estimation, Smart Dispatch Routing, & **Public Hover AI Assistant (Landing & Login Surface)**.

---

## Ringkasan Eksekutif

**Smart LIMS Module: Online Sampling Request** adalah platform web self-service enterprise yang dirancang untuk merelokasi alur transaksi manual permohonan pengambilan contoh uji lingkungan menjadi terdigitalisasi penuh. Platform ini mengatasi inefisiensi pengisian formulir fisik di kantor laboratorium, meminimalisir kesalahan penentuan parameter uji baku mutu oleh pelanggan, serta mengotomatiskan penerbitan draf **Surat Penawaran Harga (SPH)** dan dokumen **Kaji Ulang Permintaan (Klausul ISO/IEC 17025:2017 7.1)**.

Pada **Versi 2.0**, platform ini melengkapi permukaan publik (**Landing Page** & **Login Page**) dengan **Floating/Hover AI Assistant** berbasis LLM API gratis (*Zero-Cost Tier First*) yang terlindungi oleh filter prompt 4-lapisan, *rate-limiting* ketat, dan pertahanan *prompt injection* untuk memberikan panduan interaktif 24/7 kepada calon pelanggan tanpa membuka risiko keamanan data privat maupun membengkaknya biaya operasional.

---

## 1. Tujuan Aplikasi

### 1.1 Masalah yang Ingin Diselesaikan

* **Proses Manual & Inefisiensi Alur:** Pelanggan harus hadir secara fisik ke laboratorium untuk mengisi formulir kertas permohonan sampling, menentukan koordinat titik secara manual, dan berkonsultasi mengenai baku mutu.
* **Tinggi Risiko Errors (Human Error):** Transkripsi data parameter dari kertas ke LIMS internal sering menghasilkan ketidaksesuaian metode acuan SNI/Permen.
* **Ketersediaan Tim Lapangan Tidak Transparan:** Terjadi bentrok jadwal sampling akibat tidak adanya visibilitas kalender *real-time* atas kapasitas *Sampler* (petugas penganalisis lapangan) dan peralatan sampling (perangkat impinger, Hi-Vol, dll).
* **Lambatnya Penerbitan Surat Kaji Ulang & Penawaran:** Kaji ulang teknis fasilitas lab (kapasitas alat, personel, bahan habis pakai) membutuhkan koordinasi manual antar-subbag, memakan waktu 2–3 hari kerja.
* **Hambatan Awal Pengunjung & Login (Poin Baru v2.0):** Calon pelanggan kerap ragu memulai pengajuan karena tidak memahami matriks uji/regulasi, serta staf HSE sering mengalami kesulitan akses login/registrasi tanpa adanya panduan cepat 24/7.

### 1.2 Tujuan Utama Aplikasi & Nilai Bagi Pengguna

| Aspek | Nilai Bagi Pelanggan | Nilai Bagi Laboratorium |
| :--- | :--- | :--- |
| **Efisiensi Waktu** | Pengajuan sampling mandiri 24/7 dalam waktu $< 10$ menit, didukung Chatbot Assistant pada landing/login page. | Pengurangan beban *front-office* & customer service hingga 85%. |
| **Akurasi Data** | Pemilihan Baku Mutu terintegrasi regulasi pemerintah secara presisi dan terarah. | Validasi parameter dan metode uji otomatis berstandar SNI. |
| **Transparansi** | Kalender kuota sampling dan *tracking status* interaktif *real-time*. | Visibilitas *resource allocation* (personel & alat) secara tepat. |
| **Kepatuhan ISO 17025** | Draf Penawaran Harga (SPH) cepat & transparan. | Dokumen Kaji Ulang Kontrak otomatis ter-generate sesuai klausul audit. |
| **Keamanan Public AI** | Pertanyaan awal terjawab instan tanpa pendaftaran akun terlebih dahulu. | AI berjalan dengan biaya Rp 0 (Free Tier) dan terlindungi *rate limit* serta filter prompt. |

---

## 2. Untuk Siapa Aplikasi Ini (Target Pengguna & Persona)

### 2.1 Persona Pengguna & Masalah Spesifik

1. **Pelanggan / HSE Officer Perusahaan (External User):**
   * *Kebiasaan:* Membutuhkan kepastian jadwal sampling berkala untuk pelaporan UKL-UPL / AMDAL ke Dinas Lingkungan Hidup.
   * *Masalah:* Kesulitan menghitung estimasi biaya awal, tidak paham kode baku mutu yang tepat untuk jenis industrinya, dan butuh panduan cepat saat gagal masuk/daftar akun.
2. **Pengunjung Landing / Calon Pelanggan (Public Unauthenticated User - Baru v2.0):**
   * *Kebiasaan:* Mencari informasi tarif resmi, cakupan akreditasi matriks laboratorium, dan alur permohonan.
   * *Masalah:* Enggan mendaftar akun sebelum mengetahui apakah laboratorium melayani parameter khusus industri mereka.
3. **Manajer Teknis / Supervisor Sampling (Internal User):**
   * *Kebiasaan:* Mengatur penugasan *Sampler* lapangan dan memastikan ketersediaan metode uji.
   * *Masalah:* Penjadwalan bertumpuk pada hari tertentu (*peak days*) dan sering kekurangan personel tersertifikasi BNSP.
4. **Lab Admin / Customer Service (Internal User):**
   * *Kebiasaan:* Verifikasi berkas permohonan dan menerbitkan invoice/SPH.
   * *Masalah:* Cek kelengkapan parameter manual membutuhkan pembukaan dokumen fisik regulasi yang memuat ratusan matriks.
5. **Pimpinan / Kepala Balai Laboratorium (Executive User):**
   * *Kebiasaan:* Membutuhkan rangkuman bisnis harian/bulanan.
   * *Masalah:* Tidak ada dashboard insight mengenai tren permintaan matriks uji dan utilisasi personel.

### 2.2 Hak Akses & Kewenangan (Role-Based Access Control)

```
[Public Visitor]   ---> Landing / Login Page Hover Chatbot (Public Context FAQ & General Guidance Only)
                                 │
                                 ▼
[Pelanggan]        ---> Buat Permohonan -> Pilih Baku Mutu -> Tracking -> Download SPH & Kaji Ulang
[Admin Lab]        ---> Verifikasi Permohonan -> Atur Slot Kalender -> Generate SPH
[Manajer Teknis]   ---> Approval Kaji Ulang (Feasibility Assessment) -> Assign Sampler
[Pimpinan]         ---> View Analytical Dashboard & Revenue Metrics
```

---

## 3. Apa yang Dihasilkan?

### 3.1 Output Utama Sistem

* **Dokumen Digital:** Draf Surat Penawaran Harga (PDF), Dokumen Kaji Ulang Permintaan (ISO 17025 Klausul 7.1 PDF), serta Surat Perintah Kerja Sampling (SPK).
* **Kode Tracking Unik:** Kode referensi interaktif (contoh: `SMP-202611-0042`) untuk pemantauan alur status *real-time*.
* **Smart Estimation Breakdowns:** Rincian biaya per titik, per parameter uji, biaya transportasi/akomodasi lokasi, serta PPN 11%.
* **Smart Recommendations:** Rekomendasi penetapan baku mutu dan rute sampling paling efisien berdasarkan klaster geografis.
* **Public AI Hover Assistant (Poin Baru v2.0):** Layanan tanya jawab interaktif melayang (*floating widget*) yang menyajikan rujukan regulasi lingkungan publik, penjelasan matriks uji, serta bantuan kendala akun di halaman *Landing* dan *Login*.

---

## 4. Fitur Utama

### 4.1 Fitur MVP (Versi 1.0 & Pembaruan v2.0)

1. **Self-Service Customer Portal & Authentication:** Login SSO, registrasi badan usaha, dan otomatisasi klaim data profil perusahaan.
2. **Public Hover AI Assistant (Landing & Login Page - Baru v2.0):** Widget melayang responsif (`fixed bottom-6 right-6`) dengan *quick prompt* kontekstual untuk membantu pengunjung dan calon pelanggan 24/7.
3. **Interactive Fleet & Calendar Scheduler:** Kalender slot sampling interaktif dengan pembatas kapasitas tim (maksimal $N$ titik/hari).
4. **Dynamic Point & Matrix Engine:** Fitur penambahan titik sampling secara *unlimited* dengan input koordinat GPS / Google Maps picker.
5. **Auto-Regulation & Parameter Selector:** *Dropdown* regulasi (PP No. 22/2021, PermenLHK P.68/2016, dll) yang secara otomatis menandai parameter wajib beserta harga biayanya.
6. **Real-time Cost Estimator:** Kalkulator biaya aktual *client-side* secara instan.
7. **Admin Verification & Digital Contract Review:** Dasbor admin untuk mengecek ketersediaan personel & kaji ulang metode (ISO/IEC 17025:2017 Klausul 7.1).

### 4.2 Fitur Tambahan (Fase 2 - Future Enhancements)

1. **GIS Spatial Clustering:** Pengelompokan lokasi titik sampling antar-pelanggan terdekat dalam satu rute perjalanan petugas.
2. **Integrated Mobile Sampler App:** Modul lapangan untuk *digital chain of custody* (CoC) berbasis offline-first.

---

## 5. Data & Sumber Data

### 5.1 Elemen Data yang Dibutuhkan

* **Data Pelanggan:** Nama Perusahaan, NIB/NPWP, Sektor Industri, Kontak HSE, Alamat & Titik Koordinat.
* **Data Regulasi & Parameter:** Database Baku Mutu Pemerintah, Daftar Parameter (BOD, COD, TSS, $\text{NO}_2$, $\text{SO}_2$, Noise, dll), Metode SNI, Limit Deteksi Alat, dan Tarif Resmi.
* **Data Public Knowledge AI (Baru v2.0):** Dokumen FAQ publik, matriks akreditasi laboratorium, rujukan ringkas regulasi lingkungan publik, dan panduan langkah pendaftaran/login akun (bebas dari PII/data internal).
* **Data Operasional Lab:** Daftar Tim Sampler (Sertifikasi BNSP), Availability Alat Sampling, Slot Kalender Operasional.

### 5.2 Strategi Pengolahan Data

* **Data Sanitization:** Pembersihan data koordinat lokasi dan normalisasi karakter alamat perusahaan.
* **Zero PII for Public AI (Baru v2.0):** Memastikan seluruh payload prompt yang dikirim ke LLM API publik tidak mengandung data pribadi (*Personally Identifiable Information*), kredensial, atau rahasia transaksi perusahaan.
* **Indexing Parameter:** Pengindeksan *Full-Text Search* pada tabel parameter agar pencarian metode uji cepat ($< 50\text{ms}$).

---

## 6. Model & Teknologi AI

### 6.1 Fungsi AI & Machine Learning

1. **Public Hover AI Assistant (Baru v2.0):** Asisten interaktif pada *Landing* dan *Login Page* untuk konsultasi awal baku mutu dan bantuan login.
2. **Smart Parameter Recommendation Engine:** Merekomendasikan parameter uji tambahan berdasarkan sektor industri (misal: Industri Tekstil otomatis merekomendasikan parameter *Krom Hexavalen* & *Zat Warna*).
3. **Sampling Route & Schedule Optimization:** Algoritma pemeta rute tercepat (*Traveling Salesperson Problem adaptation*) untuk penghematan BBM kendaraan operasional lab.
4. **Dynamic Capacity Forecasting:** Memprediksi beban puncak sampling bulanan berdasarkan riwayat tren historis 3 tahun terakhir.

### 6.2 Tech Stack AI, Engine Gratis & Pertahanan Prompt (v2.0)

* **Architecture:** Node.js Next.js 15 Route Handlers (`/api/public-chat`) sebagai proxy aman (API Key terlindungi di server).
* **Free LLM Provider (Multi-Provider Fallback):**
  1. *Primary Choice:* **Groq Free Tier** (Menjalankan model *open-weights* cepat dengan latensi rendah di bawah *rate limit* gratis).
  2. *Secondary Fallback:* **Google Gemini API Free Tier** (Menjalankan model `Gemini Flash / Flash-Lite` melalui Google AI Studio *free tier*).
  3. *Tertiary Fallback:* **OpenRouter `:free` Models** (Sebagai *failover* cadangan jika kedua layanan utama mengalami *rate limit* `429`).
* **Prompt Injection Defense & Security Layer (4 Lapisan Filter):**
  * **Lapisan 1 (Deterministic Pre-Filter & Zod Schema):** Membatasi panjang teks user (max 500 karakter), menolak karakter kontrol Unicode tersembunyi, dan melakukan deteksi kata kunci *jailbreak / prompt extraction* (seperti `ignore previous instructions`, `system prompt`, `DAN mode`).
  * **Lapisan 2 (Context Isolation via High-Entropy Nonce):** Penggunaan tag delimiter acak per-request (`<user_input_a1b2c3d4>...</user_input_a1b2c3d4>`) untuk memisahkan instruksi sistem dengan input teks pengguna.
  * **Lapisan 3 (Zero-Tool / Domain Lock):** Chatbot publik berjalan tanpa kredensial DB dan tanpa *tool execution*, terkunci hanya pada topik sampling lingkungan dan panduan login portal.
  * **Lapisan 4 (Post-Filter & Sanitizer):** Menyaring output dari kebocoran fragment API key, URL mencurigakan (`javascript:`), serta menggunakan sanitizer Markdown aman (anti-XSS).

---

## 7. Desain & Pengalaman Pengguna (UI/UX)

### 7.1 Prinsip Desain

* **Wizard Step-by-Step UI:** Menguraikan formulir rumit menjadi 5 langkah intuitif untuk mencegah beban kognitif (*cognitive overload*).
* **Mobile-First Responsive:** Memungkinkan tim HSE pelanggan melakukan pemesanan langsung dari tablet/smartphone di lokasi pabrik.
* **Unobtrusive Hover Floating Assistant (Baru v2.0):** Chatbot berbentuk *Floating Action Button* di sudut kanan bawah yang tidak menghalangi tombol aksi utama pada *Landing Page* (CTA Buat Permohonan) maupun *Login Page* (Tombol Masuk).

### 7.2 Halaman & Komponen Utama

1. **Landing Page & Authentication Hub:** Portal informasi tarif, status kuota sampling, dan **Hover AI Chatbot Widget** di sudut kanan bawah.
2. **Login Page:** Form autentikasi SSO/Email dengan **Hover AI Chatbot Widget** yang dikonfigurasi dengan *quick prompt* seputar kendala masuk/registrasi.
3. **Form Wizard Permohonan Sampling (Step 1-5):**
   * *Step 1:* Data Profil Perusahaan & PJ Teknis.
   * *Step 2:* Pilih Tanggal & Lokasi (Kalender Slots + Maps Integration).
   * *Step 3:* Konfigurasi Titik Sampling (Tambah/Hapus Titik Dinamis).
   * *Step 4:* Pemilihan Baku Mutu & Checklist Parameter.
   * *Step 5:* Ringkasan, Estimasi Biaya, & Submit.
4. **Dashboard Pelanggan:** Tabel daftar permohonan, indikator status *stepper*, dan tombol unduh SPH.
5. **Dashboard Admin & Kaji Ulang (ISO 17025):** Panel evaluasi kelayakan teknis lab & penerbitan dokumen resmi.

---

## 8. Alur Operasional & Logika Prioritisasi

### 8.1 Alur Sistem End-to-End & Integrated Chatbot

```
[Public Visitor @ Landing / Login] ──► [Click Hover AI Chatbot] ──► [/api/public-chat Rate Limited]
                                                                                │
                                                                                ▼
                                                                [Answers FAQ / Login Guidance]

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

---

## 9. Infrastruktur & Development

### 9.1 Arsitektur Sistem

Arsitektur menggunakan pendekatan **Modern Monolith / Serverless Ready** berbasis Next.js App Router dengan integrasi API Chatbot Publik yang aman.

```
[Browser / Mobile Client (Landing, Login, Portal)] 
           │ (HTTPS / REST / Server Actions)
           ▼
[Next.js 15 App Router Frontend & API Handlers] ──► [PostgreSQL + Supabase ORM]
           │                                                │
           ├─► [Public Chat Handler (/api/public-chat)]     ├─► [Redis Cache & Rate Limiter]
           │        │                                       └─► [S3 Storage (Docs & Photos)]
           │        └─► [Groq / Gemini Free LLM Gateway]
           └─► [PDF Generator Engine (Puppeteer)]
```

### 9.2 Stack Teknologi Terpilih

* **Frontend:** Next.js 15 (TypeScript), Tailwind CSS, Shadcn UI, React Hook Form, Zod.
* **Backend API:** Node.js Next.js Route Handlers / Server Actions.
* **Database:** PostgreSQL (Disimpan di Cloud Supabase) dengan Prisma ORM.
* **Cache & Security Queue:** Redis (Upstash) untuk *locking* slot kalender real-time dan *Rate Limiting* Chatbot Publik per IP/Session.
* **LLM Engine (Free Tier):** Groq SDK / Google Generative AI SDK dengan mekanisme *Fallback Manager*.

---

## 10. Pengembangan Aplikasi

### 10.1 Tahapan & Timeline Pengembangan (Sprint 6 Minggu)

* **Minggu 1 (System Architecture & Master Data):** Setup DB PostgreSQL, Prisma Schemas, Skema Auth, dan pencatatan Master Data Regulasi/Parameter.
* **Minggu 2 (Calendar Engine & Dynamic Point Form):** Pengerjaan komponen Wizard Step 1-3, integrasi Google Maps API, & *slot locking logic*.
* **Minggu 3 (Parameter Auto-Binding & Cost Engine):** Pengerjaan Wizard Step 4-5, logika pencocokan Baku Mutu, dan kalkulasi estimasi biaya.
* **Minggu 4 (Admin Panel & ISO 17025 Workflow):** Dashboard verifikasi admin, formulir kaji ulang permintaan, dan engine cetak PDF SPH/Dokumen.
* **Minggu 5 (Public Hover AI Chatbot, Filtering & Testing):** Pengembangan komponen UI Chatbot Melayang di Landing/Login Page, integrasi Free LLM Gateway, implementasi Prompt Filtering 4-lapisan, dan UAT internal.
* **Minggu 6 (Deployment & Hardening):** Penetration testing, pengujian kebocoran *prompt*, migrasi data prod, dan rilis publik.

---

## 11. Pengujian

### 11.1 Strategi Pengujian

* **Functional & Validation Testing:** Memastikan validasi skema form (Zod) menolak input koordinat/parameter tidak sah.
* **AI Security & Prompt Injection Testing (Baru v2.0):** Menguji ketahanan chatbot publik terhadap serangan *jailbreak*, upaya ekstraksi prompt sistem, *token flooding*, serta memastikan tidak ada kebocoran data internal/PII.
* **ISO/IEC 17025 Auditability Test:** Memastikan dokumen Kaji Ulang Permintaan merekam identitas peninjau, tanggal, dan catatan kelayakan teknis tanpa celah manipulasi.
* **Performance & Rate Limit Testing:** Memastikan waktu muat kalender $< 1.5$ detik dan *Rate Limiter* Redis memblokir *flooding request* chatbot pada $15$ req/menit per IP.

---

## 12. Keamanan & Privasi

### 12.1 Keamanan Data, Proteksi Privasi & Public AI Safeguards

* **Data Enkripsi:** Enkripsi *Data-at-Rest* menggunakan AES-256 dan *Data-in-Transit* menggunakan TLS 1.3.
* **Role-Based Access Control (RBAC):** Pelanggan hanya dapat melihat data permohonan perusahaan milik sendiri (*Strict Tenant Isolation*).
* **Public Chatbot Data Isolation (Baru v2.0):** Chatbot publik tidak terhubung ke basis data transaksi/profil pelanggan. Informasi yang disajikan murni berbasis *hardcoded curated knowledge base*.
* **Strict Rate Limiting & Bot Defense (Baru v2.0):** Integrasi Upstash Redis Rate Limiting (Maks 15 request/menit per IP) dan validasi Cloudflare Turnstile jika terdeteksi aktivitas bot.
* **Audit Trail Unalterable Log:** Setiap tindakan persetujuan kaji ulang oleh Manajer Teknis dicatat secara immutable pada tabel `audit_logs` untuk audit ISO 17025.

---

## 13. Persiapan Deployment

### 13.1 Lingkungan Deployment (Environments)

1. **Development:** Local Docker (Postgres, Redis).
2. **Staging:** Vercel Staging + Supabase Staging DB (Untuk UAT Internal dan Pengujian Chatbot AI).
3. **Production:** Vercel Enterprise + Managed Supabase Production DB + Upstash Redis + Cloudflare Web Application Firewall (WAF) dengan aturan CSP ketat.

---

## 14. Domain & Branding

* **Nama Produk:** **SmartLIMS - Online Sampling Portal**
* **Tagline:** "Pengambilan Sampel Lingkungan Cepat, Presisi, dan Berstandar ISO/IEC 17025."
* **Arah Branding Visual:** Professional Corporate Clean (Dominan Deep Navy Blue `#0F172A`, aksen Emerald Green `#10B981` untuk indikator kelayakan/ISO, dan Cyan Blue `#06B6D4` untuk status transaksional & elemen aktif Chatbot AI).

---

## 15. Publish & Launch

### 15.1 Checklist Peluncuran (Go-Live Checklist)

* [x] Schema DB Prod ter-migrate & ter-seed master regulasi pemerintah terbaru.
* [x] SSL/TLS Certificate aktif dan terverifikasi Grade A+ Qualys.
* [x] Integrasi generator PDF SPH & Kaji Ulang Permintaan berjalan presisi.
* [x] Floating AI Assistant aktif pada Landing Page & Login Page dengan filter prompt 4-lapisan terverifikasi aman.
* [x] API Key LLM Gratis (Groq/Gemini) terkonfigurasi pada Environment Variable produksi dengan mekanisme *fallback* aktif.
* [x] UAT ditandatangani oleh Manajer Teknis & Kepala Laboratorium.
* [x] Sistem backup basis data otomatis 6 jam sekali telah terkonfigurasi.

---

## 16. Monitoring & Iterasi

### 16.1 Metrik Kinerja & Dashboard Pemantauan

* **Operational Metrics:** Rata-rata waktu pengajuan (Target: $<8$ menit), Persentase Kaji Ulang Terverifikasi dalam $<4$ jam.
* **System Metrics:** System Uptime $99.9\%$, API Response Time $<300\text{ms}$.
* **AI Metrics (Baru v2.0):** Tingkat keberhasilan jawaban Chatbot Publik (Target: $>90\%$ tanpa *fallback error*), rasio pemblokiran *prompt injection* terdeteksi, dan penggunaan kuota API gratis harian.
* **Business Impact Metrics:** Tingkat konversi Draf SPH menjadi SPK Sampling (Target: $>75\%$).

---

## Lampiran A. Functional Requirements

| ID | Requirement | Prioritas |
| :--- | :--- | :--- |
| **FR-01** | Pelanggan dapat mendaftar dan login SSO/Email. | Must Have |
| **FR-02** | Pelanggan dapat menentukan jumlah titik sampling secara dinamis pada form. | Must Have |
| **FR-03** | Sistem mencocokkan Baku Mutu dengan parameter wajib secara otomatis. | Must Have |
| **FR-04** | Sistem menghitung estimasi biaya otomatis sesuai tarif resmi. | Must Have |
| **FR-05** | Admin dapat mengelola slot ketersediaan kalender tim sampling. | Must Have |
| **FR-06** | Manajer Teknis dapat melakukan input formulir Kaji Ulang Permintaan (ISO 17025). | Must Have |
| **FR-07** | Sistem menerbitkan PDF Surat Penawaran Harga (SPH) dengan QR Validation. | Must Have |
| **FR-08** | Engine AI memberikan rekomendasi parameter berdasarkan sektor industri. | Should Have |
| **FR-09** | **Pengunjung/Pelanggan dapat mengakses Floating AI Chatbot di Landing Page & Login Page.** | Must Have |
| **FR-10** | **Sistem Chatbot Publik menyediakan Quick Prompts kontekstual sesuai halaman aktif.** | Must Have |
| **FR-11** | **Backend Proxy API menerapkan Filter Prompt 4-lapisan & Delimiter Nonce untuk anti-injection.** | Must Have |
| **FR-12** | **Sistem memanfaatkan Gateway LLM Gratis (Groq/Gemini) dengan automatic fallback.** | Must Have |

---

## Lampiran B. Non-Functional Requirements

| ID | Kategori | Requirements |
| :--- | :--- | :--- |
| **NFR-01** | Performa | Respon UI saat menambah titik sampling dinamis $< 100\text{ms}$. |
| **NFR-02** | Keamanan | Seluruh komunikasi API wajib terenkripsi TLS 1.3 & token JWT / Session. |
| **NFR-03** | Kepatuhan | Memenuhi klausul ISO/IEC 17025:2017 (Klausul 7.1 Kaji Ulang Permintaan). |
| **NFR-04** | Skalabilitas | Basis data mampu menangani hingga $1,000,000$ baris transaksi parameter. |
| **NFR-05** | AI Latency | Tampilan awal respon Chatbot Publik $< 2.5$ detik menggunakan Free Tier API. |
| **NFR-06** | Privacy | Zero PII Transmission: Dilarang mengirimkan data privat pelanggan ke endpoint LLM publik. |
| **NFR-07** | Rate Limit | Batas maksimum request Chatbot Publik adalah 15 req/menit per IP untuk menjaga kuota gratis. |

---

## Lampiran C. Data Model Awal & Redis Schema (v2.0)

```sql
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

-- Log Keamanan Chatbot AI Publik (Tanpa PII)
CREATE TABLE public_ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_hash VARCHAR(64) NOT NULL,
    page_context VARCHAR(20) NOT NULL, -- 'landing' atau 'login'
    is_flagged_injection BOOLEAN DEFAULT FALSE,
    response_time_ms INTEGER NOT NULL,
    provider_used VARCHAR(30) NOT NULL, -- 'groq-free', 'gemini-free', 'openrouter-free'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Lampiran D. Template Dashboard Management Brief (Pimpinan)

```
================================================================================
MANAGEMENT BRIEF: STATISTIK SAMPLING & KAJI ULANG PERMINTAAN LAB
================================================================================
Periode Operasional : 01 November 2026 - 19 November 2026

1. HIGHLIGHT TRANSAKSI:
   - Total Permohonan Masuk : 158 Permohonan
   - Disetujui (SPK Issued)  : 132 Permohonan (83.5%)
   - Pending Kaji Ulang      : 19 Permohonan
   - Ditolak (Kapasitas Lab) : 7 Permohonan

2. AI ASSISTANT ENGAGEMENT (PUBLIC SURFACE):
   - Total Chat Sessions    : 420 Sesi (Landing: 310, Login: 110)
   - Prompt Blocked (Pola)  : 12 Upaya Injection (Terdeteksi & Di-block)
   - Cost LLM API           : Rp 0,- (100% Covered by Free Tier Engine)

3. UTILISASI MATRIKS TERPOPULER:
   [1] Air Limbah Industri : 52% Total Titik
   [2] Udara Ambien        : 28% Total Titik
   [3] Emisi Cerobong      : 20% Total Titik

4. ESTIMASI REVENUE & EFFICIENCY:
   - Total Estimasi Nilai Kontrak : Rp 535.200.000,-
   - Rata-rata Waktu Verifikasi   : 1.6 Jam (Perbaikan 68% dari manual)
================================================================================
```

---

## Lampiran E. Prompt v0.dev / Shadcn UI Generator (Pembaruan Chatbot Hover)

```text
Buatkan antarmuka web modern untuk aplikasi Smart LIMS Modul Permohonan Pengambilan Contoh Uji (Sampling) Online.
Tampilkan dua komponen utama:
1. Landing Page dengan Header, Hero Section, Feature Grid, dan Tombol CTA "Buat Permohonan Online".
2. Floating AI Assistant Widget di sudut kanan bawah (fixed bottom-6 right-6):
   - Berupa Floating Button bundar warna Deep Slate Navy (#0F172A) dengan icon Bot/Sparkles dan indikator status hijau (Online).
   - Saat diklik, membuka Popover Chat Card berukuran 380px x 520px.
   - UI Chat memiliki Header "SmartLIMS Assistant (Free AI)", area percakapan bertipe bubble, 3 Quick Prompt Buttons ("Baku Mutu Air Limbah", "Cara Daftar Akun", "Estimasi Waktu Sampling"), dan Input Box dengan tombol Kirim.
   - Sertakan badge kecil "ISO 17025 Verified Guidance".

Gunakan Tailwind CSS, warna tema Deep Slate Navy (#0F172A), aksen Cyan Blue (#06B6D4) untuk active/hover state, dan Emerald Green (#10B981) untuk badge status. Tampilan harus sangat bersih, enterprise-grade, dan responsive.
```