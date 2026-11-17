export type MatrixType = 'Air Limbah' | 'Udara Ambien' | 'Emisi Cerobong' | 'Air Bersih';

export interface ParameterItem {
  code: string;
  name: string;
  method: string;
  limit: string;
  price: number;
}

export interface RegulationPreset {
  id: string;
  code: string;
  title: string;
  matrix: MatrixType;
  sectorHint: string;
  parameters: ParameterItem[];
}

export interface CalendarSlotDay {
  date: string;
  dayLabel: string;
  dateNum: string;
  totalSlots: number;
  usedSlots: number;
  teamAssigned: string;
  equipmentReady: string;
}

export type PortalRoleId = 'customer' | 'admin' | 'technical_manager' | 'executive';

export interface PortalRoleInfo {
  id: PortalRoleId;
  category: 'external' | 'internal';
  label: string;
  shortTitle: string;
  summary: string;
  capabilities: string[];
  outputBadge: string;
}

export const REGULATION_PRESETS: RegulationPreset[] = [
  {
    id: 'permenlhk-p68',
    code: 'PermenLHK P.68/2016',
    title: 'Baku Mutu Air Limbah Domestik',
    matrix: 'Air Limbah',
    sectorHint: 'Kawasan Industri, Perkantoran, Fasyankes, & Perhotelan',
    parameters: [
      { code: 'pH', name: 'Derajat Keasaman (pH)', method: 'SNI 6989.11:2019', limit: '6,0 – 9,0', price: 65000 },
      { code: 'BOD', name: 'Biochemical Oxygen Demand (BOD₅)', method: 'SNI 6989.72:2009', limit: '30 mg/L', price: 185000 },
      { code: 'COD', name: 'Chemical Oxygen Demand (COD)', method: 'SNI 6989.2:2019', limit: '100 mg/L', price: 165000 },
      { code: 'TSS', name: 'Total Suspended Solids (TSS)', method: 'SNI 6989.3:2019', limit: '30 mg/L', price: 110000 },
      { code: 'OIL', name: 'Minyak & Lemak', method: 'SNI 6989.10:2011', limit: '5 mg/L', price: 210000 },
      { code: 'NH3', name: 'Amoniak Total (NH₃-N)', method: 'SNI 06-6989.30-2005', limit: '10 mg/L', price: 145000 },
    ],
  },
  {
    id: 'pp22-2021-udara',
    code: 'PP No. 22/2021 Lamp. VII',
    title: 'Baku Mutu Udara Ambien Nasional',
    matrix: 'Udara Ambien',
    sectorHint: 'Pemantauan RKL-RPL Kawasan Pabrik & Tapak Proyek',
    parameters: [
      { code: 'SO2', name: 'Sulfur Dioksida (SO₂) 1 Jam', method: 'SNI 7119.7:2017', limit: '150 µg/Nm³', price: 275000 },
      { code: 'NO2', name: 'Nitrogen Dioksida (NO₂) 1 Jam', method: 'SNI 7119.2:2017', limit: '200 µg/Nm³', price: 275000 },
      { code: 'TSP', name: 'Partikulat Tersuspensi (TSP) 24 Jam', method: 'SNI 7119.3:2017', limit: '230 µg/Nm³', price: 420000 },
      { code: 'PM25', name: 'Partikulat Halus (PM₂.₅) 24 Jam', method: 'SNI 7119.14:2016', limit: '55 µg/Nm³', price: 490000 },
      { code: 'NOISE', name: 'Kebisingan Lingkungan (24 Jam)', method: 'KepMenLH 48/1996', limit: '70 dBA', price: 310000 },
    ],
  },
  {
    id: 'permenlhk-15-2019',
    code: 'PermenLHK No. 15/2019',
    title: 'Emisi Sumber Tidak Bergerak (Boiler & Genset)',
    matrix: 'Emisi Cerobong',
    sectorHint: 'Manufaktur, Tekstil, Makanan & Minuman, Pembangkit',
    parameters: [
      { code: 'PART', name: 'Partikulat Total Isokinetik', method: 'SNI 7117.17:2009', limit: '150 mg/Nm³', price: 850000 },
      { code: 'SO2E', name: 'Sulfur Dioksida (SO₂) Cerobong', method: 'SNI 7117.18:2009', limit: '600 mg/Nm³', price: 390000 },
      { code: 'NOXE', name: 'Nitrogen Oksida (NOₓ) sebagai NO₂', method: 'SNI 7117.19:2009', limit: '800 mg/Nm³', price: 390000 },
      { code: 'OPAC', name: 'Opasitas Asap Cerobong', method: 'SNI 19-7117.11-2005', limit: '20 %', price: 150000 },
    ],
  },
  {
    id: 'permenkes-2-2023',
    code: 'Permenkes No. 2/2023',
    title: 'Standar Baku Mutu Air untuk Keperluan Higiene',
    matrix: 'Air Bersih',
    sectorHint: 'Industri Pangan, Rumah Sakit, & Fasilitas Publik',
    parameters: [
      { code: 'TURB', name: 'Kekeruhan', method: 'SNI 06-6989.25-2005', limit: '3 NTU', price: 75000 },
      { code: 'TDS', name: 'Zat Padat Terlarut (TDS)', method: 'SNI 6989.27:2019', limit: '300 mg/L', price: 85000 },
      { code: 'FE', name: 'Besi Terlarut (Fe)', method: 'SNI 6989.4:2009', limit: '0,2 mg/L', price: 140000 },
      { code: 'ECOLI', name: 'Escherichia coli', method: 'APHA 9222 D', limit: '0 CFU/100mL', price: 225000 },
    ],
  },
];

export const CALENDAR_SLOTS: CalendarSlotDay[] = [
  {
    date: '2026-11-18',
    dayLabel: 'Rab',
    dateNum: '18 Nov',
    totalSlots: 6,
    usedSlots: 6,
    teamAssigned: 'Tim Lapangan A & B (Penuh)',
    equipmentReady: 'Impinger Set, Hi-Vol Sampler, DO Meter',
  },
  {
    date: '2026-11-19',
    dayLabel: 'Kam',
    dateNum: '19 Nov',
    totalSlots: 6,
    usedSlots: 4,
    teamAssigned: 'Tim Lapangan C (2 Slot Tersisa)',
    equipmentReady: 'Isokinetik Cerobong, Multiparameter Probe',
  },
  {
    date: '2026-11-20',
    dayLabel: 'Jum',
    dateNum: '20 Nov',
    totalSlots: 6,
    usedSlots: 2,
    teamAssigned: 'Tim Lapangan A & C (4 Slot Tersisa)',
    equipmentReady: 'Impinger Set, Sound Level Meter, Water Sampler',
  },
  {
    date: '2026-11-23',
    dayLabel: 'Sen',
    dateNum: '23 Nov',
    totalSlots: 6,
    usedSlots: 1,
    teamAssigned: 'Seluruh Tim BNSP Siaga (5 Slot Tersisa)',
    equipmentReady: 'Paket Lengkap Air, Udara Ambien, & Emisi',
  },
  {
    date: '2026-11-24',
    dayLabel: 'Sel',
    dateNum: '24 Nov',
    totalSlots: 6,
    usedSlots: 3,
    teamAssigned: 'Tim Lapangan B (3 Slot Tersisa)',
    equipmentReady: 'Hi-Vol PM2.5, Gas Analyzer, Multiparameter',
  },
];

export const PORTAL_ROLES: PortalRoleInfo[] = [
  {
    id: 'customer',
    category: 'external',
    label: 'Pelanggan / HSE Perusahaan',
    shortTitle: 'Pelanggan & HSE',
    summary:
      'Ajukan permohonan sampling berkala untuk pelaporan UKL-UPL atau AMDAL dalam waktu kurang dari 10 menit tanpa harus datang ke laboratorium.',
    capabilities: [
      'Wizard pengajuan 5 langkah dengan simpan draf otomatis',
      'Penambahan titik sampling dinamis beserta koordinat GPS',
      'Pengikatan baku mutu otomatis dan estimasi biaya transparan',
      'Pantau status kode tracking dan unduh SPH PDF ber-QR',
    ],
    outputBadge: 'Akses Eksternal · Tenant Terisolasi',
  },
  {
    id: 'admin',
    category: 'internal',
    label: 'Admin Lab / Customer Service',
    shortTitle: 'Admin Lab',
    summary:
      'Verifikasi berkas permohonan masuk, validasi kesesuaian parameter regulasi, kunci slot kalender operasional, dan terbitkan draf SPH resmi.',
    capabilities: [
      'Antrean verifikasi permohonan dengan pengecekan baku mutu otomatis',
      'Pengelolaan kuota harian armada dan kalender operasional',
      'Penerbitan draf Surat Penawaran Harga (SPH) instan',
      'Notifikasi revisi terstruktur langsung ke HSE pelanggan',
    ],
    outputBadge: 'Akses Internal · Front-Office & Billing',
  },
  {
    id: 'technical_manager',
    category: 'internal',
    label: 'Manajer Teknis / Supervisor',
    shortTitle: 'Manajer Teknis',
    summary:
      'Laksanakan Kaji Ulang Permintaan sesuai Klausul 7.1 ISO/IEC 17025:2017 secara digital sebelum penugasan personel bersertifikat BNSP.',
    capabilities: [
      'Evaluasi kelayakan metode SNI, alat ukur, dan bahan habis pakai',
      'Persetujuan digital Kaji Ulang Permintaan dengan jejak audit permanen',
      'Penugasan tim Sampler bersertifikat BNSP dan penerbitan SPK',
      'Pencegahan bentrok jadwal pada hari sibuk operasional',
    ],
    outputBadge: 'Akses Internal · Otoritas ISO 17025',
  },
  {
    id: 'executive',
    category: 'internal',
    label: 'Pimpinan / Kepala Balai',
    shortTitle: 'Kepala Balai',
    summary:
      'Pantau ringkasan eksekutif permohonan masuk, utilisasi matriks uji terpopuler, tingkat konversi SPH, dan proyeksi pendapatan laboratorium.',
    capabilities: [
      'Ringkasan konversi draf SPH menjadi SPK Sampling aktif',
      'Analisis distribusi matriks uji (Air Limbah, Ambien, Emisi)',
      'Pemantauan SLA waktu verifikasi dan kaji ulang teknis',
      'Audit log keputusan strategis yang tidak dapat dimanipulasi',
    ],
    outputBadge: 'Akses Internal · Executive Brief',
  },
];

export const INDUSTRY_SECTORS = [
  { id: 'tekstil', label: 'Industri Tekstil & Pencelupan', extraParam: 'Krom Heksavalen (Cr⁶⁺) & Zat Warna' },
  { id: 'manufaktur', label: 'Manufaktur, Logam & Otomotif', extraParam: 'Logam Berat (Pb, Cd, Cu, Zn) & Minyak' },
  { id: 'fnb', label: 'Makanan, Minuman & Agroindustri', extraParam: 'BOD₅ Beban Tinggi, COD, & Total Coliform' },
  { id: 'fasyankes', label: 'Rumah Sakit & Fasilitas Kesehatan', extraParam: 'Fenol, Fosfat (PO₄), & Mikrobiologi' },
  { id: 'kawasan', label: 'Kawasan Industri & Pengelola IPAL', extraParam: 'Debit Air Limbah Harian & Amoniak Total' },
  { id: 'energi', label: 'Pertambangan, Energi & Pembangkit', extraParam: 'Emisi Isokinetik SO₂, NOₓ, & Opasitas' },
];

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}
