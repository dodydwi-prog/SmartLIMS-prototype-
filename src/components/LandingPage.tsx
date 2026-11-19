import { useRef, useState } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  FileCheck2,
  Lock,
  MapPin,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import {
  CALENDAR_SLOTS,
  INDUSTRY_SECTORS,
  PORTAL_ROLES,
  PortalRoleId,
  REGULATION_PRESETS,
  formatRupiah,
} from '../data/limsPreviewData';
import { ErlenmeyerReaction } from './ErlenmeyerReaction';
import { Navbar } from './Navbar';

interface LandingPageProps {
  onNavigateLogin: (preselectedRole?: PortalRoleId) => void;
}

export function LandingPage({ onNavigateLogin }: LandingPageProps) {
  const shouldReduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const simulasiRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll();
  const smoothScrollProgress = useSpring(scrollYProgress, {
    stiffness: 160,
    damping: 26,
    restDelta: 0.001,
  });

  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroLeftY = useTransform(heroScrollProgress, [0, 1], [0, 10]);
  const heroRightY = useTransform(heroScrollProgress, [0, 1], [0, -14]);

  const { scrollYProgress: simulasiScrollProgress } = useScroll({
    target: simulasiRef,
    offset: ['start 95%', 'start 20%'],
  });

  // Interactive Hero Calculator state
  const [selectedPresetId, setSelectedPresetId] = useState<string>(REGULATION_PRESETS[0].id);
  const [pointCount, setPointCount] = useState<number>(2);
  const [uncheckedParams, setUncheckedParams] = useState<Record<string, boolean>>({});

  // Interactive Bento states
  const [selectedSectorId, setSelectedSectorId] = useState<string>(INDUSTRY_SECTORS[0].id);
  const [selectedDate, setSelectedDate] = useState<string>(CALENDAR_SLOTS[2].date);
  const [catalogRegId, setCatalogRegId] = useState<string>(REGULATION_PRESETS[0].id);
  const [activeRoleId, setActiveRoleId] = useState<PortalRoleId>('customer');

  const activePreset =
    REGULATION_PRESETS.find((r) => r.id === selectedPresetId) ?? REGULATION_PRESETS[0];

  const selectedParameters = activePreset.parameters.filter(
    (param) => !uncheckedParams[`${activePreset.id}:${param.code}`]
  );

  const perPointTotal = selectedParameters.reduce((sum, p) => sum + p.price, 0);
  const subtotal = perPointTotal * pointCount;
  const ppn = Math.round(subtotal * 0.11);
  const grandTotal = subtotal + ppn;

  const activeSector =
    INDUSTRY_SECTORS.find((s) => s.id === selectedSectorId) ?? INDUSTRY_SECTORS[0];
  const activeSlot =
    CALENDAR_SLOTS.find((d) => d.date === selectedDate) ?? CALENDAR_SLOTS[0];
  const catalogReg =
    REGULATION_PRESETS.find((r) => r.id === catalogRegId) ?? REGULATION_PRESETS[0];
  const activeRole =
    PORTAL_ROLES.find((role) => role.id === activeRoleId) ?? PORTAL_ROLES[0];

  const toggleParameter = (regId: string, code: string) => {
    const key = `${regId}:${code}`;
    setUncheckedParams((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const scrollToSection = (id: string) => {
    const el = document.querySelector(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div id="beranda" className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar onNavigateLogin={() => onNavigateLogin('customer')} />

      {/* Scroll-Driven Reading Progress Line */}
      {!shouldReduceMotion && (
        <motion.div
          aria-hidden="true"
          style={{ scaleX: smoothScrollProgress }}
          className="pointer-events-none fixed top-16 right-0 left-0 z-50 h-[2px] origin-left bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500"
        />
      )}

      <main>
        {/* HERO SLIDE 1: SLIDE JUDUL */}
        <section
          ref={heroRef}
          className="overflow-hidden border-b border-slate-200 bg-white"
        >
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
              {/* Slide 1 Left: Title & Value Proposition */}
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                style={shouldReduceMotion ? undefined : { y: heroLeftY }}
                className="lg:col-span-7"
              >
                <p className="font-mono text-xs tracking-wide text-slate-500">
                  ISO/IEC 17025:2017 · Klausul 7.1 · Pengambilan Contoh Uji Terintegrasi
                </p>

                <h1
                  className="mt-4 font-display font-bold tracking-tight text-slate-900 text-balance"
                  style={{ fontSize: 'clamp(2.25rem, 3.8vw, 3.5rem)', lineHeight: 1.08 }}
                >
                  Permohonan Sampling Lingkungan{' '}
                  <span className="bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500 bg-clip-text text-transparent">
                    Cepat, Presisi, dan Terstandar.
                  </span>
                </h1>

                <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
                  Platform mandiri untuk pengajuan pengambilan contoh uji air limbah, udara ambien,
                  emisi cerobong, dan air bersih. Terhubung langsung dengan database baku mutu
                  regulasi, kuota tim bersertifikat BNSP, serta penerbitan draf SPH dan dokumen
                  Kaji Ulang Permintaan.
                </p>
              </motion.div>

              {/* Slide 1 Right: Primary Actions Placed on the Right Side */}
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08, ease: 'easeOut' }}
                style={shouldReduceMotion ? undefined : { y: heroRightY }}
                className="lg:col-span-5"
              >
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-6 sm:p-7">
                  <p className="font-display text-sm font-semibold text-slate-900">
                    Mulai Pengajuan atau Tinjau Regulasi
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Masuk ke portal pengajuan sampling 5 langkah atau periksa parameter baku mutu SNI
                    yang berlaku.
                  </p>

                  <div className="mt-5 flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => onNavigateLogin('customer')}
                      className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-slate-800 active:bg-slate-950 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 cursor-pointer"
                    >
                      <span>Masuk ke Portal Permohonan</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => scrollToSection('#regulasi')}
                      className="inline-flex min-h-[46px] w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 transition-colors duration-150 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 cursor-pointer"
                    >
                      Lihat Katalog Baku Mutu
                    </button>
                  </div>

                  <div className="mt-5 border-t border-slate-200/90 pt-4">
                    <p className="text-xs leading-relaxed text-slate-500">
                      Mendukung akses Pelanggan HSE Perusahaan, Admin Lab, Manajer Teknis, dan Kepala
                      Balai.
                    </p>
                    <button
                      type="button"
                      onClick={() => scrollToSection('#simulasi-baku-mutu')}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 transition-colors hover:text-cyan-800 cursor-pointer"
                    >
                      <span>Buka Simulasi Pengikatan Baku Mutu</span>
                      <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Full-Width 4-Column Proof Strip */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="mt-14 grid grid-cols-1 gap-6 border-t border-slate-200 pt-10 sm:grid-cols-2 lg:grid-cols-4"
            >
              <div>
                <p className="font-mono text-2xl font-semibold tabular-nums text-slate-900">
                  &lt; 10 Menit
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Pengajuan sampling mandiri 24/7 melalui form wizard 5 langkah terstruktur
                </p>
              </div>
              <div>
                <p className="font-mono text-2xl font-semibold tabular-nums text-slate-900">85%</p>
                <p className="mt-1 text-sm text-slate-600">
                  Pengurangan beban input front-office dan eliminasi salah ketik metode SNI
                </p>
              </div>
              <div>
                <p className="font-mono text-2xl font-semibold tabular-nums text-slate-900">
                  &lt; 4 Jam
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Target penyelesaian Kaji Ulang Permintaan ISO/IEC 17025 oleh Manajer Teknis
                </p>
              </div>
              <div>
                <p className="font-mono text-2xl font-semibold tabular-nums text-slate-900">
                  100% SNI
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Validasi parameter uji terikat langsung pada regulasi pemerintah terkini
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* HERO SLIDE 2: SIMULASI PENGIKATAN BAKU MUTU & REAKSI ERLENMEYER */}
        <section
          ref={simulasiRef}
          id="simulasi-baku-mutu"
          className="scroll-mt-16 overflow-hidden border-b border-slate-200 bg-slate-50"
        >
          <div className="mx-auto max-w-7xl px-4 pt-10 pb-14 sm:px-6 sm:pt-12 sm:pb-16 lg:px-8 lg:pt-14 lg:pb-16">
            <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12 lg:gap-10">
              {/* Simulation Slide Left: Constrained Header + Scroll-Driven Growing Plant in Erlenmeyer */}
              <div className="flex flex-col justify-between lg:col-span-5">
                <div className="max-w-md">
                  <p className="font-mono text-xs font-medium text-cyan-700">
                    Simulasi Pra-Pengajuan · Keterikatan Regulasi &amp; Estimasi Biaya
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl text-balance">
                    Simulasi Pengikatan Baku Mutu dan Estimasi Tarif SPH
                  </h2>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-600 sm:text-base">
                    Sesuaikan matriks contoh uji, parameter SNI, dan jumlah titik untuk melihat
                    keterikatan regulasi serta estimasi biaya secara langsung.
                  </p>
                </div>

                <motion.div
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className="mt-6 flex items-center justify-center lg:mt-4"
                >
                  <ErlenmeyerReaction scrollProgress={simulasiScrollProgress} />
                </motion.div>
              </div>

              {/* Simulation Slide Right: Interactive Regulation & Cost Estimator Card */}
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.45, delay: 0.06, ease: 'easeOut' }}
                className="lg:col-span-7"
              >
                <div className="flex h-full flex-col justify-between rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-100 sm:p-7">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
                      <div>
                        <p className="font-display text-sm font-semibold text-white">
                          Simulasi Pengikatan Baku Mutu &amp; Estimasi Tarif
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          Pilih matriks uji untuk menghitung estimasi biaya SPH sebelum masuk
                        </p>
                      </div>
                      <span className="font-mono text-xs text-emerald-400">
                        {activePreset.code}
                      </span>
                    </div>

                    {/* Matrix Switcher Tabs */}
                    <div
                      role="tablist"
                      aria-label="Pilih matriks contoh uji"
                      className="mt-4 grid grid-cols-2 gap-1.5 rounded-lg bg-slate-950 p-1 sm:grid-cols-4"
                    >
                      {REGULATION_PRESETS.map((preset) => {
                        const isActive = preset.id === activePreset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => setSelectedPresetId(preset.id)}
                            className={`min-h-[36px] rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap truncate cursor-pointer ${
                              isActive
                                ? 'bg-cyan-500 text-slate-950 font-semibold'
                                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                            }`}
                          >
                            {preset.matrix}
                          </button>
                        );
                      })}
                    </div>

                    {/* Parameter Interactive Checklist */}
                    <div className="mt-5 space-y-2">
                      {activePreset.parameters.slice(0, 4).map((param) => {
                        const isChecked = !uncheckedParams[`${activePreset.id}:${param.code}`];
                        return (
                          <button
                            key={param.code}
                            type="button"
                            onClick={() => toggleParameter(activePreset.id, param.code)}
                            className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                              isChecked
                                ? 'border-slate-700 bg-slate-800/70 text-white'
                                : 'border-slate-800/80 bg-slate-900/50 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                  isChecked
                                    ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                                    : 'border-slate-600 bg-transparent'
                                }`}
                              >
                                {isChecked && <Check className="h-3 w-3 stroke-[2.5]" />}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{param.name}</p>
                                <p className="truncate font-mono text-xs text-slate-400">
                                  {param.method} · Baku Mutu {param.limit}
                                </p>
                              </div>
                            </div>
                            <span className="font-mono text-xs font-medium tabular-nums text-cyan-300 shrink-0">
                              {formatRupiah(param.price)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Estimator Footer Summary */}
                  <div className="mt-6 border-t border-slate-800 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">Jumlah Titik:</span>
                        <div className="inline-flex items-center rounded-md border border-slate-700 bg-slate-950">
                          <button
                            type="button"
                            onClick={() => setPointCount((c) => Math.max(1, c - 1))}
                            aria-label="Kurangi titik sampling"
                            className="h-8 w-8 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-mono text-xs font-semibold tabular-nums text-white">
                            {pointCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPointCount((c) => Math.min(10, c + 1))}
                            aria-label="Tambah titik sampling"
                            className="h-8 w-8 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-slate-400">
                          Estimasi Total ({selectedParameters.length} parameter · Termasuk PPN 11%)
                        </p>
                        <p className="font-mono text-xl font-semibold tabular-nums text-white">
                          {formatRupiah(grandTotal)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-800/80 pt-3">
                      <span className="text-xs tabular-nums text-slate-400">
                        Subtotal {formatRupiah(subtotal)} + PPN {formatRupiah(ppn)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onNavigateLogin('customer')}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 transition-colors hover:text-cyan-300 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>Ajukan di Portal</span>
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* SECTION 01: KAPABILITAS INTI (ASYMMETRIC BENTO GRID) */}
        <section id="kapabilitas" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-medium text-cyan-700">
              01. Kapabilitas Inti Portal
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl text-balance">
              Dirancang untuk menghilangkan hambatan pengajuan dan verifikasi laboratorium
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Setiap modul terhubung dari pemilihan titik lokasi pelanggan hingga persetujuan teknis
              internal laboratorium tanpa pemrosesan ulang data.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Bento 1 (col-span-2): Auto-Regulation & AI Industry Recommendation */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2"
            >
              <div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 text-slate-900">
                    <SlidersHorizontal className="h-5 w-5 text-cyan-600" aria-hidden="true" />
                    <h3 className="font-display text-lg font-semibold">
                      Pengikatan Baku Mutu &amp; Rekomendasi Sektor Industri
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-slate-500">FR-03 · FR-08</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Pilih sektor industri perusahaan Anda. Sistem memetakan regulasi acuan beserta
                  parameter wajib dan parameter tambahan spesifik industri untuk pelaporan UKL-UPL
                  atau AMDAL.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {INDUSTRY_SECTORS.map((sector) => {
                    const isSelected = sector.id === activeSector.id;
                    return (
                      <button
                        key={sector.id}
                        type="button"
                        onClick={() => setSelectedSectorId(sector.id)}
                        className={`min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {sector.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 flex flex-col justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Rekomendasi Parameter Tambahan Sektor Terpilih
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {activeSector.extraParam}
                  </p>
                </div>
                <span className="font-mono text-xs font-medium text-emerald-700">
                  Metode SNI Tervalidasi
                </span>
              </div>
            </motion.div>

            {/* Bento 2 (col-span-1): Interactive Calendar Quota Preview */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.4, delay: 0.06, ease: 'easeOut' }}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 text-slate-900">
                    <CalendarDays className="h-5 w-5 text-cyan-600" aria-hidden="true" />
                    <h3 className="font-display text-lg font-semibold">
                      Kalender Kuota Sampler
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-slate-500">FR-05</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Visibilitas kapasitas harian tim BNSP dan alat sampling untuk mencegah bentrok jadwal.
                </p>

                <div className="mt-5 grid grid-cols-5 gap-1.5">
                  {CALENDAR_SLOTS.map((day) => {
                    const remaining = day.totalSlots - day.usedSlots;
                    const isSelected = day.date === activeSlot.date;
                    return (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => setSelectedDate(day.date)}
                        className={`flex flex-col items-center rounded-lg border py-2.5 text-center transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-cyan-600 bg-cyan-50 text-slate-900'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-[11px] text-slate-500">{day.dayLabel}</span>
                        <span className="mt-0.5 font-mono text-xs font-semibold">
                          {day.dateNum.split(' ')[0]}
                        </span>
                        <span
                          className={`mt-1 font-mono text-[11px] font-medium ${
                            remaining === 0
                              ? 'text-rose-600'
                              : remaining <= 2
                                ? 'text-amber-600'
                                : 'text-emerald-700'
                          }`}
                        >
                          {remaining}/{day.totalSlots}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-900">{activeSlot.teamAssigned}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Alat Siaga: {activeSlot.equipmentReady}
                </p>
              </div>
            </motion.div>

            {/* Bento 3 (col-span-1): Dynamic Points & GPS */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.4, delay: 0.08, ease: 'easeOut' }}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 text-slate-900">
                    <MapPin className="h-5 w-5 text-cyan-600" aria-hidden="true" />
                    <h3 className="font-display text-lg font-semibold">
                      Titik Sampling Dinamis
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-slate-500">FR-02</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Tambahkan titik pengambilan contoh uji secara dinamis dengan penandaan koordinat
                  GPS untuk setiap matriks.
                </p>
              </div>

              <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-4 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">1. Outlet IPAL Utama</span>
                  <span className="font-mono text-slate-500">-6.24158, 107.14892</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">2. Udara Ambien Upwind</span>
                  <span className="font-mono text-slate-500">-6.24011, 107.14605</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">3. Cerobong Boiler Unit 2</span>
                  <span className="font-mono text-slate-500">-6.24290, 107.15044</span>
                </div>
              </div>
            </motion.div>

            {/* Bento 4 (col-span-2): ISO 17025 Clause 7.1 & Instant SPH */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.4, delay: 0.12, ease: 'easeOut' }}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2"
            >
              <div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 text-slate-900">
                    <FileCheck2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                    <h3 className="font-display text-lg font-semibold">
                      Otomatisasi Kaji Ulang Permintaan (ISO 17025) &amp; Draf SPH
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-slate-500">FR-06 · FR-07</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Mengubah proses verifikasi manual 2–3 hari menjadi evaluasi digital teraudit.
                  Setiap persetujuan Manajer Teknis langsung menerbitkan dokumen Kaji Ulang
                  Permintaan, SPH ber-QR Code, dan Surat Perintah Kerja (SPK) Sampling.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
                <div>
                  <p className="font-mono text-xs text-slate-500">Dokumen 01</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    Draf &amp; Final SPH (PDF)
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Rincian tarif per titik, transportasi lokasi, PPN 11%, dan validasi QR.
                  </p>
                </div>
                <div>
                  <p className="font-mono text-xs text-slate-500">Dokumen 02</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    Kaji Ulang Klausul 7.1
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Catatan kelayakan metode SNI, alat ukur, bahan habis pakai, dan personel.
                  </p>
                </div>
                <div>
                  <p className="font-mono text-xs text-slate-500">Dokumen 03</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    SPK &amp; Kode Tracking
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Kode unik format <span className="font-mono">SMP-202611-0042</span> untuk
                    pantauan status real-time.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* SECTION 02: KATALOG BAKU MUTU & TARIF TRANSPARAN */}
        <section id="regulasi" className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <p className="font-mono text-xs font-medium text-cyan-700">
                  02. Katalog Regulasi &amp; Parameter Uji
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl text-balance">
                  Daftar parameter, metode acuan SNI, dan tarif resmi yang terikat langsung di portal
                </h2>
              </div>

              {/* Regulation Tabs */}
              <div className="flex flex-wrap gap-1.5 rounded-lg bg-slate-100 p-1">
                {REGULATION_PRESETS.map((reg) => {
                  const isActive = reg.id === catalogReg.id;
                  return (
                    <button
                      key={reg.id}
                      type="button"
                      onClick={() => setCatalogRegId(reg.id)}
                      className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {reg.code}
                    </button>
                  );
                })}
              </div>
            </div>

            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="mt-8 overflow-hidden rounded-xl border border-slate-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
                <div>
                  <h3 className="font-display text-sm font-semibold text-slate-900">
                    {catalogReg.code} — {catalogReg.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Matriks: {catalogReg.matrix} · Relevansi: {catalogReg.sectorHint}
                  </p>
                </div>
                <span className="font-mono text-xs font-medium text-slate-600">
                  {catalogReg.parameters.length} Parameter Terdaftar
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-white text-xs font-semibold text-slate-500">
                      <th className="px-5 py-3">Kode</th>
                      <th className="px-5 py-3">Parameter Uji</th>
                      <th className="px-5 py-3">Metode Acuan</th>
                      <th className="px-5 py-3">Ambang Baku Mutu</th>
                      <th className="px-5 py-3 text-right">Tarif Satuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {catalogReg.parameters.map((param) => (
                      <tr key={param.code} className="hover:bg-slate-50/80">
                        <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-700">
                          {param.code}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-900">{param.name}</td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                          {param.method}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-emerald-700">
                          {param.limit}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold text-slate-900">
                          {formatRupiah(param.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        </section>

        {/* SECTION 03: ALUR END-TO-END & HAK AKSES PERAN */}
        <section id="alur-kerja" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-medium text-cyan-700">
              03. Alur Operasional &amp; Hak Akses Peran
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl text-balance">
              Satu alur kerja terpadu bagi pelanggan dan tim internal laboratorium
            </h2>
          </div>

          <div className="mt-10">
            {/* 4-Step End-to-End Flow */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  stepLabel: 'Tahap 01',
                  accent: 'text-cyan-700',
                  title: 'Pengajuan Wizard 5-Langkah',
                  desc: 'Pelanggan mengisi profil PJ, tanggal kuota, titik koordinat, regulasi, dan melihat draf estimasi biaya.',
                },
                {
                  stepLabel: 'Tahap 02',
                  accent: 'text-cyan-700',
                  title: 'Verifikasi Admin Lab',
                  desc: 'Validasi berkas permohonan, pengecekan parameter wajib regulasi, dan penguncian slot kalender tim.',
                },
                {
                  stepLabel: 'Tahap 03',
                  accent: 'text-emerald-700',
                  title: 'Kaji Ulang ISO 17025',
                  desc: 'Manajer Teknis mengevaluasi kesiapan metode SNI dan menugaskan petugas Sampler bersertifikat BNSP.',
                },
                {
                  stepLabel: 'Tahap 04',
                  accent: 'text-emerald-700',
                  title: 'Terbit SPH & SPK Sampling',
                  desc: 'Sistem menerbitkan SPH final dan SPK lapangan. Status permohonan otomatis menjadi Siap Eksekusi.',
                },
              ].map((item, idx) => (
                <motion.div
                  key={item.stepLabel}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: idx * 0.07, ease: 'easeOut' }}
                  className="rounded-xl border border-slate-200 bg-white p-5"
                >
                  <p className={`font-mono text-xs font-semibold ${item.accent}`}>
                    {item.stepLabel}
                  </p>
                  <h3 className="mt-2 font-display text-base font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-600">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Interactive Role Switcher */}
          <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-6 lg:flex-row lg:items-center">
              <div>
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  Cakupan Kewenangan Berbasis Peran (RBAC)
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Pilih peran untuk meninjau fungsi portal sebelum menuju halaman masuk.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 rounded-lg bg-slate-100 p-1">
                {PORTAL_ROLES.map((role) => {
                  const isActive = role.id === activeRole.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setActiveRoleId(role.id)}
                      className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {role.shortTitle}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <p className="font-mono text-xs text-slate-500">{activeRole.outputBadge}</p>
                <h4 className="mt-1.5 font-display text-xl font-bold text-slate-900">
                  {activeRole.label}
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{activeRole.summary}</p>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => onNavigateLogin(activeRole.id)}
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Masuk sebagai {activeRole.shortTitle}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <ul className="space-y-3 rounded-lg bg-slate-50 p-5 lg:col-span-5">
                {activeRole.capabilities.map((cap) => (
                  <li key={cap} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                      aria-hidden="true"
                    />
                    <span>{cap}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* SECTION 04: KEPATUHAN & KEAMANAN DATA + CONVERSION CTA */}
        <section id="kepatuhan" className="border-t border-slate-200 bg-slate-900 text-slate-100">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="lg:col-span-7"
              >
                <p className="font-mono text-xs font-medium text-emerald-400">
                  04. Kepatuhan Audit &amp; Proteksi Data
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl text-balance">
                  Keamanan arsip perusahaan dan integritas jejak audit ISO/IEC 17025
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                  Setiap permohonan sampling, revisi parameter, dan persetujuan kelayakan teknis
                  dicatat secara permanen untuk memastikan kesiapan audit akreditasi laboratorium
                  serta menjaga kerahasiaan data lingkungan tiap badan usaha.
                </p>

                <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400"
                      aria-hidden="true"
                    />
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Audit Trail Tidak Dapat Diubah
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">
                        Merekam identitas peninjau, stempel waktu, dan catatan kelayakan teknis di
                        tabel <span className="font-mono text-slate-300">audit_logs</span>.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Lock className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" aria-hidden="true" />
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Isolasi Tenant &amp; Enkripsi
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">
                        Enkripsi AES-256 dan TLS 1.3 dengan isolasi akses ketat antar-perusahaan
                        pelanggan.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
                className="rounded-xl border border-slate-800 bg-slate-950/70 p-7 lg:col-span-5"
              >
                <h3 className="font-display text-xl font-bold text-white">
                  Siap mengajukan permohonan sampling laboratorium?
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Masuk menggunakan akun perusahaan atau SSO untuk mengakses formulir wizard
                  5-langkah, kalender kuota real-time, dan draf SPH otomatis.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigateLogin('customer')}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 cursor-pointer"
                  >
                    <span>Menuju Halaman Login Portal</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateLogin('admin')}
                    className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800/60 cursor-pointer"
                  >
                    Login Personel Internal Lab
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      {/* QUIET FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-4 py-8 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div>
            <p className="font-display text-base font-bold text-slate-900">SmartLIMS</p>
            <p className="mt-1 text-xs text-slate-500">
              Sistem Informasi Manajemen Laboratorium Lingkungan Terintegrasi · ISO/IEC 17025:2017
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500">
            <a
              href="#kapabilitas"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('#kapabilitas');
              }}
              className="hover:text-slate-900"
            >
              Kapabilitas
            </a>
            <a
              href="#regulasi"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('#regulasi');
              }}
              className="hover:text-slate-900"
            >
              Regulasi &amp; Tarif
            </a>
            <a
              href="#alur-kerja"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('#alur-kerja');
              }}
              className="hover:text-slate-900"
            >
              Alur Kerja
            </a>
            <button
              type="button"
              onClick={() => onNavigateLogin('customer')}
              className="font-medium text-slate-900 hover:underline cursor-pointer"
            >
              Masuk Portal
            </button>
            <span>© 2026 SmartLIMS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
