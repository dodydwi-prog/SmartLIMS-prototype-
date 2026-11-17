import { useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  Check,
  Download,
  FilePlus2,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { REGULATION_PRESETS, formatRupiah } from '../data/limsPreviewData';
import { STATUS_META } from '../data/limsMockDatabase';
import {
  downloadSamplingRequestsCsv,
  downloadSphPdf,
  downloadSpkPdf,
} from '../services/pdfReports';
import {
  CalendarCapacityDay,
  DemoUser,
  RequestStatus,
  SamplingRequest,
} from '../types/lims';
import { CustomerWizard } from './CustomerWizard';
import { DocumentModal, LimsDocumentType } from './DocumentModal';

type CustomerNavTab = 'dashboard' | 'wizard' | 'calendar' | 'catalog';

interface CustomerPortalProps {
  currentUser: DemoUser;
  requests: SamplingRequest[];
  calendarDays: CalendarCapacityDay[];
  onAddRequest: (req: SamplingRequest) => Promise<void> | void;
  onUpdateRequest: (req: SamplingRequest) => Promise<void> | void;
  onLogout: () => void;
}

export function CustomerPortal({
  currentUser,
  requests,
  calendarDays,
  onAddRequest,
  onUpdateRequest,
  onLogout,
}: CustomerPortalProps) {
  const [activeTab, setActiveTab] = useState<CustomerNavTab>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Dashboard filters & selection
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RequestStatus>('ALL');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [recentTrackingBanner, setRecentTrackingBanner] = useState<string | null>(null);
  const [recentBannerType, setRecentBannerType] = useState<'create' | 'revise'>('create');

  // Wizard edit / preselected date state
  const [editingRequest, setEditingRequest] = useState<SamplingRequest | null>(null);
  const [wizardInitialDate, setWizardInitialDate] = useState<string | null>(null);

  // Document modal state
  const [docPreview, setDocPreview] = useState<{
    request: SamplingRequest;
    type: LimsDocumentType;
  } | null>(null);

  // Catalog filter
  const [catalogRegId, setCatalogRegId] = useState<string>(REGULATION_PRESETS[0].id);

  // Filter requests belonging to this customer (or created by this user)
  const myRequests = requests.filter(
    (r) => r.companyId === currentUser.id || r.picEmail === currentUser.email
  );

  const filteredRequests = myRequests.filter((r) => {
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      r.trackingCode.toLowerCase().includes(q) ||
      r.points.some(
        (p) =>
          p.pointName.toLowerCase().includes(q) ||
          p.matrixType.toLowerCase().includes(q)
      );
    return matchesStatus && matchesSearch;
  });

  const activeRequest =
    myRequests.find((r) => r.id === selectedRequestId) ?? filteredRequests[0] ?? null;

  const approvedCount = myRequests.filter((r) => r.status === 'APPROVED').length;
  const pendingCount = myRequests.filter(
    (r) => r.status === 'SUBMITTED' || r.status === 'VERIFIED'
  ).length;
  const totalEstimatedSpend = myRequests
    .filter((r) => r.status !== 'REJECTED')
    .reduce((sum, r) => sum + r.totalEstimatedCost, 0);

  const openNewWizard = (preselectedDate?: string) => {
    setEditingRequest(null);
    setWizardInitialDate(preselectedDate ?? null);
    setActiveTab('wizard');
  };

  const openRevisionWizard = (req: SamplingRequest) => {
    setEditingRequest(req);
    setWizardInitialDate(null);
    setActiveTab('wizard');
  };

  const handleWizardSubmit = async (newReq: SamplingRequest) => {
    await onAddRequest(newReq);
    setEditingRequest(null);
    setWizardInitialDate(null);
    setSelectedRequestId(newReq.id);
    setRecentBannerType('create');
    setRecentTrackingBanner(newReq.trackingCode);
    setActiveTab('dashboard');
  };

  const handleWizardResubmit = async (updatedReq: SamplingRequest) => {
    await onUpdateRequest(updatedReq);
    setEditingRequest(null);
    setWizardInitialDate(null);
    setSelectedRequestId(updatedReq.id);
    setRecentBannerType('revise');
    setRecentTrackingBanner(updatedReq.trackingCode);
    setActiveTab('dashboard');
  };

  const navItems: { id: CustomerNavTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'wizard', label: 'Buat Permohonan', icon: FilePlus2 },
    { id: 'calendar', label: 'Jadwal Kalender', icon: CalendarDays },
    { id: 'catalog', label: 'Katalog Baku Mutu', icon: BookOpen },
  ];

  const activeCatalog =
    REGULATION_PRESETS.find((r) => r.id === catalogRegId) ?? REGULATION_PRESETS[0];

  const breadcrumbLabel =
    navItems.find((n) => n.id === activeTab)?.label ?? 'Dashboard';

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Sidebar (#0F172A Deep Slate Navy) */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between bg-slate-900 text-slate-100 lg:sticky lg:top-0 lg:flex lg:h-screen lg:overflow-y-auto">
        <div>
          <div className="flex h-16 items-center border-b border-slate-800 px-6">
            <span className="font-display text-lg font-bold tracking-tight text-white">
              SmartLIMS
            </span>
          </div>

          <div className="px-4 py-5">
            <p className="px-2 text-[11px] font-medium text-slate-400">
              Portal Pelanggan
            </p>
            <nav className="mt-2 space-y-1" aria-label="Menu portal pelanggan">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id === 'wizard') {
                        openNewWizard();
                      } else {
                        setEditingRequest(null);
                        setWizardInitialDate(null);
                        setActiveTab(item.id);
                      }
                    }}
                    className={`flex min-h-[42px] w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-400'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="border-t border-slate-800 p-4 space-y-2">
          <div className="px-2 pb-2">
            <p className="truncate text-xs font-semibold text-white">{currentUser.companyName}</p>
            <p className="truncate font-mono text-[11px] text-slate-400">
              NIB {currentUser.nibOrNip}
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex min-h-[38px] w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative z-10 flex w-72 flex-col justify-between bg-slate-900 p-4 text-slate-100">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span className="font-display text-lg font-bold text-white">SmartLIMS</span>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="p-2 text-slate-400 hover:text-white"
                  aria-label="Tutup menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="mt-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.id === 'wizard') {
                          openNewWizard();
                        } else {
                          setEditingRequest(null);
                          setWizardInitialDate(null);
                          setActiveTab(item.id);
                        }
                        setMobileNavOpen(false);
                      }}
                      className={`flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-sm font-medium ${
                        isActive ? 'bg-cyan-500/15 text-cyan-400' : 'text-slate-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
            <div className="space-y-2 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={onLogout}
                className="flex min-h-[42px] w-full items-center gap-2 rounded-lg px-3 text-xs font-medium text-slate-400"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Keluar Sesi</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar Contract */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Buka menu navigasi"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 lg:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">Pelanggan</span>
              <span className="text-slate-300">/</span>
              <span className="font-display font-semibold text-slate-900 truncate">
                {breadcrumbLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden text-xs text-slate-500 sm:inline">
              {currentUser.name}
            </span>
            {activeTab !== 'wizard' && (
              <button
                type="button"
                onClick={() => openNewWizard()}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Permohonan Baru</span>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {recentTrackingBanner && (
                  <div
                    role="status"
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-xs text-emerald-950"
                  >
                    <div>
                      <span className="font-semibold">
                        {recentBannerType === 'revise'
                          ? 'Revisi permohonan & jadwal berhasil diajukan ulang!'
                          : 'Permohonan berhasil dikirim!'}
                      </span>{' '}
                      Kode tracking Anda:{' '}
                      <span className="font-mono font-bold">{recentTrackingBanner}</span>. Anda
                      dapat meninjau draf SPH sambil menunggu verifikasi dari Admin Laboratorium.
                    </div>
                    <button
                      type="button"
                      onClick={() => setRecentTrackingBanner(null)}
                      className="font-semibold text-emerald-800 hover:underline cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                )}

                {/* 4 KPI Summary Row */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <p className="text-xs font-medium text-slate-500">Total Permohonan</p>
                    <p className="mt-2 font-mono text-2xl font-bold text-slate-900">
                      {myRequests.length}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Permohonan terdaftar perusahaan</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <p className="text-xs font-medium text-slate-500">Dalam Proses Verifikasi</p>
                    <p className="mt-2 font-mono text-2xl font-bold text-cyan-700">
                      {pendingCount}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Menunggu Admin / Kaji Ulang</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <p className="text-xs font-medium text-slate-500">Siap Eksekusi (SPK)</p>
                    <p className="mt-2 font-mono text-2xl font-bold text-emerald-700">
                      {approvedCount}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Kaji Ulang ISO 17025 disetujui</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <p className="text-xs font-medium text-slate-500">Total Estimasi Kontrak</p>
                    <p className="mt-2 font-mono text-xl font-bold text-slate-900">
                      {formatRupiah(totalEstimatedSpend)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Akumulasi draf &amp; final SPH</p>
                  </div>
                </div>

                {/* Tracking Table + Detail Stepper Split */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                  {/* Left: Request List Table */}
                  <div className="rounded-xl border border-slate-200 bg-white lg:col-span-7">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
                      <div className="relative min-w-[200px] flex-1">
                        <Search
                          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                          aria-hidden="true"
                        />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Cari kode tracking atau titik..."
                          className="min-h-[38px] w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-xs text-slate-900 focus:border-cyan-600 focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
                          {(['ALL', 'SUBMITTED', 'VERIFIED', 'APPROVED', 'REJECTED'] as const).map(
                            (st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setStatusFilter(st)}
                                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                                  statusFilter === st
                                    ? 'bg-white text-slate-900 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {st === 'ALL' ? 'Semua' : st}
                              </button>
                            )
                          )}
                        </div>
                        {myRequests.length > 0 && (
                          <button
                            type="button"
                            onClick={() => downloadSamplingRequestsCsv(myRequests)}
                            title="Ekspor rekap permohonan (CSV)"
                            className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                            <span>CSV</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {filteredRequests.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-sm font-semibold text-slate-900">
                          Tidak ada permohonan yang cocok
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Ubah kata kunci pencarian atau buat permohonan sampling baru.
                        </p>
                        <button
                          type="button"
                          onClick={() => openNewWizard()}
                          className="mt-4 inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                        >
                          <FilePlus2 className="h-3.5 w-3.5" />
                          <span>Buat Permohonan Pertama</span>
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-500">
                              <th className="px-4 py-3">Kode Tracking</th>
                              <th className="px-4 py-3">Jadwal</th>
                              <th className="px-4 py-3">Titik</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3 text-right">Estimasi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredRequests.map((req) => {
                              const st = STATUS_META[req.status];
                              const isSelected = activeRequest?.id === req.id;
                              return (
                                <tr
                                  key={req.id}
                                  onClick={() => setSelectedRequestId(req.id)}
                                  className={`cursor-pointer transition-colors ${
                                    isSelected ? 'bg-cyan-50/60' : 'hover:bg-slate-50'
                                  }`}
                                >
                                  <td className="px-4 py-3.5 font-mono font-semibold text-slate-900">
                                    {req.trackingCode}
                                  </td>
                                  <td className="px-4 py-3.5 font-mono text-slate-600">
                                    {req.scheduledDate}
                                  </td>
                                  <td className="px-4 py-3.5 font-mono text-slate-600">
                                    {req.points.length} titik
                                  </td>
                                  <td className={`px-4 py-3.5 font-medium ${st.textClass}`}>
                                    {st.glyph} {st.label.split(' ')[0]}
                                  </td>
                                  <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-900">
                                    {formatRupiah(req.totalEstimatedCost)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Right: Selected Request Stepper & Document Downloads */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
                    {activeRequest ? (
                      <div className="space-y-5">
                        <div className="border-b border-slate-200 pb-4">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-sm font-bold text-slate-900">
                              {activeRequest.trackingCode}
                            </span>
                            <span
                              className={`text-xs font-semibold ${
                                STATUS_META[activeRequest.status].textClass
                              }`}
                            >
                              {STATUS_META[activeRequest.status].glyph}{' '}
                              {STATUS_META[activeRequest.status].label}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            Dibuat pada {activeRequest.createdAt} · Jadwal{' '}
                            <span className="font-mono">{activeRequest.scheduledDate}</span>
                          </p>
                        </div>

                        {/* 4-Stage Status Stepper */}
                        <div>
                          <p className="text-xs font-semibold text-slate-700">
                            Progres Permohonan Real-Time
                          </p>
                          <div className="mt-3 space-y-3 text-xs">
                            {[
                              {
                                label: '1. Permohonan Diajukan Pelanggan',
                                done: true,
                                detail: `Draf SPH otomatis terbit (${activeRequest.points.length} titik)`,
                              },
                              {
                                label: '2. Verifikasi Berkas & Slot Admin Lab',
                                done:
                                  activeRequest.status === 'VERIFIED' ||
                                  activeRequest.status === 'APPROVED',
                                detail: activeRequest.verifiedAt
                                  ? `Diverifikasi ${activeRequest.verifiedAt}`
                                  : 'Menunggu antrean Admin Lab',
                              },
                              {
                                label: '3. Kaji Ulang Teknis ISO/IEC 17025 (7.1)',
                                done: activeRequest.status === 'APPROVED',
                                detail: activeRequest.kajiUlang
                                  ? `Disahkan oleh ${activeRequest.kajiUlang.reviewerName}`
                                  : 'Menunggu persetujuan Manajer Teknis',
                              },
                              {
                                label: '4. Penugasan Sampler & Siap Eksekusi',
                                done: activeRequest.status === 'APPROVED',
                                detail: activeRequest.kajiUlang
                                  ? activeRequest.kajiUlang.assignedSamplerName
                                  : 'SPK belum diterbitkan',
                              },
                            ].map((stage, i) => (
                              <div key={i} className="flex items-start gap-2.5">
                                <span
                                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                                    stage.done
                                      ? 'bg-emerald-600 text-white'
                                      : 'border border-slate-300 bg-white'
                                  }`}
                                >
                                  {stage.done && <Check className="h-2.5 w-2.5" />}
                                </span>
                                <div>
                                  <p
                                    className={`font-semibold ${
                                      stage.done ? 'text-slate-900' : 'text-slate-500'
                                    }`}
                                  >
                                    {stage.label}
                                  </p>
                                  <p className="text-slate-500">{stage.detail}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {activeRequest.status === 'REJECTED' && (
                          <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-900">
                            <div>
                              <p className="font-semibold">Catatan Revisi Laboratorium:</p>
                              <p className="mt-0.5">
                                {activeRequest.rejectionReason ||
                                  'Permohonan perlu disesuaikan kembali oleh pelanggan.'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => openRevisionWizard(activeRequest)}
                              className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-lg bg-rose-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-800 cursor-pointer"
                            >
                              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Revisi Jadwal &amp; Ajukan Ulang</span>
                            </button>
                          </div>
                        )}

                        {activeRequest.status === 'SUBMITTED' && (
                          <button
                            type="button"
                            onClick={() => openRevisionWizard(activeRequest)}
                            className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-lg border border-cyan-300 bg-cyan-50/70 px-3.5 py-2 text-xs font-semibold text-cyan-900 hover:bg-cyan-100/70 cursor-pointer"
                          >
                            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Ubah Jadwal / Titik Sampling</span>
                          </button>
                        )}

                        {/* Points summary */}
                        <div className="border-t border-slate-200 pt-4">
                          <p className="text-xs font-semibold text-slate-700">
                            Titik &amp; Matriks Terdaftar
                          </p>
                          <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
                            {activeRequest.points.map((pt, i) => (
                              <li key={pt.id} className="flex justify-between gap-2">
                                <span className="truncate">
                                  {i + 1}. {pt.pointName} ({pt.matrixType})
                                </span>
                                <span className="font-mono font-medium text-slate-900 shrink-0">
                                  {pt.selectedParameterCodes.length} param
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Document Actions */}
                        <div className="space-y-2 border-t border-slate-200 pt-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setDocPreview({ request: activeRequest, type: 'sph' })
                              }
                              className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                            >
                              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>
                                {activeRequest.status === 'APPROVED' ? 'SPH Final' : 'Draf SPH'}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadSphPdf(activeRequest)}
                              title="Unduh langsung file PDF SPH"
                              className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5 text-cyan-700" aria-hidden="true" />
                              <span>PDF</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setDocPreview({ request: activeRequest, type: 'kaji-ulang' })
                              }
                              className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Kaji Ulang 17025</span>
                            </button>

                            {activeRequest.status === 'APPROVED' ? (
                              <button
                                type="button"
                                onClick={() => downloadSpkPdf(activeRequest)}
                                className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                              >
                                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Unduh SPK</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setDocPreview({ request: activeRequest, type: 'spk' })
                                }
                                className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 cursor-pointer"
                              >
                                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Draf SPK</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Pilih salah satu permohonan untuk melihat status dan dokumen.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'wizard' && (
              <CustomerWizard
                key={editingRequest?.id ?? `new-${wizardInitialDate ?? 'default'}`}
                currentUser={currentUser}
                calendarDays={calendarDays}
                existingRequests={requests}
                editingRequest={editingRequest}
                initialDate={wizardInitialDate}
                onSubmitRequest={handleWizardSubmit}
                onResubmitRequest={handleWizardResubmit}
                onCancel={() => {
                  setEditingRequest(null);
                  setWizardInitialDate(null);
                  setActiveTab('dashboard');
                }}
              />
            )}

            {activeTab === 'calendar' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6">
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Jadwal &amp; Kuota Tim Sampler Laboratorium
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Pantau sisa slot harian sebelum menjadwalkan pengambilan contoh uji baru.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openNewWizard()}
                    className="min-h-[40px] rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                  >
                    Pesan Slot Sekarang
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {calendarDays.map((day) => {
                    const usedSlots = requests
                      .filter((r) => r.scheduledDate === day.date && r.status !== 'REJECTED')
                      .reduce((sum, r) => sum + r.points.length, 0);
                    const remaining = Math.max(0, day.maxCapacity - usedSlots);
                    const myBookingsOnDate = myRequests.filter(
                      (r) => r.scheduledDate === day.date
                    );
                    const isAvailable = !day.isLocked && remaining > 0;

                    return (
                      <div
                        key={day.date}
                        className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-base font-bold text-slate-900">
                              {day.dayLabel}, {day.dateLabel}
                            </span>
                            <span
                              className={`font-mono text-xs font-semibold ${
                                day.isLocked
                                  ? 'text-slate-500'
                                  : remaining === 0
                                    ? 'text-rose-600'
                                    : 'text-emerald-700'
                              }`}
                            >
                              {day.isLocked
                                ? 'Terkunci'
                                : `${remaining}/${day.maxCapacity} Tersisa`}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-slate-600">{day.equipmentNote}</p>
                        </div>

                        <div className="mt-4 space-y-3">
                          {myBookingsOnDate.length > 0 && (
                            <div className="border-t border-slate-100 pt-3">
                              <p className="text-[11px] font-semibold text-cyan-700">
                                Jadwal Perusahaan Anda:
                              </p>
                              {myBookingsOnDate.map((b) => (
                                <p
                                  key={b.id}
                                  className="mt-0.5 font-mono text-xs text-slate-800"
                                >
                                  {b.trackingCode} ({b.points.length} titik)
                                </p>
                              ))}
                            </div>
                          )}

                          {isAvailable && (
                            <button
                              type="button"
                              onClick={() => openNewWizard(day.date)}
                              className="inline-flex min-h-[36px] w-full items-center justify-center rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-900 hover:text-white transition-colors cursor-pointer"
                            >
                              Pilih Tanggal Ini
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'catalog' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6">
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Katalog Baku Mutu &amp; Tarif Parameter Resmi
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Acuan regulasi pemerintah, metode uji SNI terakreditasi, dan harga satuan.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
                    {REGULATION_PRESETS.map((reg) => (
                      <button
                        key={reg.id}
                        type="button"
                        onClick={() => setCatalogRegId(reg.id)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer ${
                          catalogRegId === reg.id
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {reg.code}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 bg-slate-50 px-5 py-3.5">
                    <p className="font-display text-sm font-bold text-slate-900">
                      {activeCatalog.code} — {activeCatalog.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      Matriks: {activeCatalog.matrix} · {activeCatalog.sectorHint}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="px-5 py-3">Kode</th>
                          <th className="px-5 py-3">Parameter Uji</th>
                          <th className="px-5 py-3">Metode SNI / Acuan</th>
                          <th className="px-5 py-3">Baku Mutu</th>
                          <th className="px-5 py-3 text-right">Tarif Satuan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeCatalog.parameters.map((p) => (
                          <tr key={p.code} className="hover:bg-slate-50">
                            <td className="px-5 py-3 font-mono font-semibold text-slate-700">
                              {p.code}
                            </td>
                            <td className="px-5 py-3 font-medium text-slate-900">{p.name}</td>
                            <td className="px-5 py-3 font-mono text-slate-600">{p.method}</td>
                            <td className="px-5 py-3 font-mono text-emerald-700">{p.limit}</td>
                            <td className="px-5 py-3 text-right font-mono font-semibold text-slate-900">
                              {formatRupiah(p.price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {docPreview && (
        <DocumentModal
          request={docPreview.request}
          docType={docPreview.type}
          onClose={() => setDocPreview(null)}
        />
      )}
    </div>
  );
}
