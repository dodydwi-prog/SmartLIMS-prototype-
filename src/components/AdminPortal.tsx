import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Users,
  X,
} from 'lucide-react';
import { REGULATION_PRESETS, formatRupiah } from '../data/limsPreviewData';
import { SAMPLER_TEAMS, STATUS_META } from '../data/limsMockDatabase';
import { ADMIN_TAB_TO_PATH, AdminNavTab } from '../routes';
import { formatNowTimestamp } from '../services/limsFirestore';
import {
  downloadAuditLogsCsv,
  downloadAuditTrailPdf,
  downloadKajiUlangPdf,
  downloadManagementBriefPdf,
  downloadSamplingRequestsCsv,
  downloadSphPdf,
  downloadSpkPdf,
} from '../services/pdfReports';
import {
  AuditLogEntry,
  CalendarCapacityDay,
  DemoUser,
  KajiUlangReview,
  RequestStatus,
  SamplerTeam,
  SamplingRequest,
} from '../types/lims';
import { DocumentModal, LimsDocumentType } from './DocumentModal';
import { MonthlyScheduleCalendar } from './MonthlyScheduleCalendar';

const REVISION_REASON_PRESETS = [
  'Slot jadwal pada tanggal dipilih penuh, mohon pilih ulang tanggal sampling.',
  'Peralatan sampling sedang dalam masa kalibrasi, mohon jadwalkan ulang.',
  'Koordinat GPS atau deskripsi titik sampling belum sesuai, mohon lengkapi.',
  'Parameter baku mutu belum sesuai regulasi sektor industri terkait.',
];

interface AdminPortalProps {
  activeTab: AdminNavTab;
  currentUser: DemoUser;
  requests: SamplingRequest[];
  calendarDays: CalendarCapacityDay[];
  auditLogs: AuditLogEntry[];
  usersDirectory?: DemoUser[];
  samplerTeams?: SamplerTeam[];
  onVerifyRequest: (requestId: string, verifierName: string) => Promise<void> | void;
  onRejectRequest: (
    requestId: string,
    reason: string,
    actorName: string
  ) => Promise<void> | void;
  onApproveKajiUlang: (
    requestId: string,
    review: KajiUlangReview
  ) => Promise<void> | void;
  onUpdateCalendarDay: (
    date: string,
    patch: Partial<CalendarCapacityDay>
  ) => Promise<void> | void;
  onLogout: () => void;
}

export function AdminPortal({
  activeTab,
  currentUser,
  requests,
  calendarDays,
  auditLogs,
  usersDirectory = [],
  samplerTeams = SAMPLER_TEAMS,
  onVerifyRequest,
  onRejectRequest,
  onApproveKajiUlang,
  onUpdateCalendarDay,
  onLogout,
}: AdminPortalProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const reqQueryParam = searchParams.get('req');
  const regQueryParam = searchParams.get('reg');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Verification Center & mutation state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RequestStatus>('ALL');
  const [selectedReqId, setSelectedReqId] = useState<string>(
    reqQueryParam || requests[0]?.id || ''
  );

  useEffect(() => {
    if (reqQueryParam) {
      setSelectedReqId(reqQueryParam);
    }
  }, [reqQueryParam]);

  const navigateToTab = (tab: AdminNavTab, reqId?: string) => {
    const basePath = ADMIN_TAB_TO_PATH[tab];
    if (reqId && (tab === 'verification' || tab === 'kaji-ulang')) {
      navigate(`${basePath}?req=${encodeURIComponent(reqId)}`);
    } else {
      navigate(basePath);
    }
  };

  const handleSelectRequest = (reqId: string) => {
    setSelectedReqId(reqId);
    setSearchParams({ req: reqId }, { replace: true });
  };
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [actionBanner, setActionBanner] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  // Kaji Ulang ISO 17025 form state
  const [methodAvailable, setMethodAvailable] = useState(true);
  const [equipmentCalibrated, setEquipmentCalibrated] = useState(true);
  const [consumablesReady, setConsumablesReady] = useState(true);
  const [personnelCompetent, setPersonnelCompetent] = useState(true);
  const [selectedSamplerId, setSelectedSamplerId] = useState(
    samplerTeams[0]?.id ?? SAMPLER_TEAMS[0].id
  );
  const [technicalNotes, setTechnicalNotes] = useState(
    'Metode acuan SNI terakreditasi, peralatan terkalibrasi, dan tim sampler BNSP siap bertugas.'
  );
  const [showKajiRejectBox, setShowKajiRejectBox] = useState(false);
  const [kajiRejectReason, setKajiRejectReason] = useState('');

  // Catalog tab (persisted via ?reg query param)
  const catalogRegId =
    regQueryParam && REGULATION_PRESETS.some((r) => r.id === regQueryParam)
      ? regQueryParam
      : REGULATION_PRESETS[0].id;
  const setCatalogRegId = (regId: string) => {
    setSearchParams({ reg: regId }, { replace: true });
  };

  // Document modal
  const [docPreview, setDocPreview] = useState<{
    request: SamplingRequest;
    type: LimsDocumentType;
  } | null>(null);

  const totalCount = requests.length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const pendingReviewCount = requests.filter(
    (r) => r.status === 'SUBMITTED' || r.status === 'VERIFIED'
  ).length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;
  const conversionRate =
    totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
  const totalContractValue = requests
    .filter((r) => r.status !== 'REJECTED')
    .reduce((sum, r) => sum + r.totalEstimatedCost, 0);

  // Matrix utilization counts
  const allPoints = requests.flatMap((r) => r.points);
  const matrixCounts = (
    ['Air Limbah', 'Udara Ambien', 'Emisi Cerobong', 'Air Bersih'] as const
  ).map((m) => {
    const count = allPoints.filter((p) => p.matrixType === m).length;
    const pct = allPoints.length > 0 ? Math.round((count / allPoints.length) * 100) : 0;
    return { matrix: m, count, pct };
  });

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      r.trackingCode.toLowerCase().includes(q) ||
      r.companyName.toLowerCase().includes(q) ||
      r.picName.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const selectedRequest =
    requests.find((r) => r.id === selectedReqId) ?? filteredRequests[0] ?? null;

  const kajiUlangQueue = requests.filter(
    (r) => r.status === 'VERIFIED' || r.status === 'SUBMITTED'
  );
  const urgentDashboardQueue =
    kajiUlangQueue.length > 0 ? kajiUlangQueue.slice(0, 5) : requests.slice(0, 5);
  const activeKajiRequest =
    requests.find((r) => r.id === selectedReqId) ?? kajiUlangQueue[0] ?? requests[0] ?? null;

  const handleConfirmVerify = async (req: SamplingRequest) => {
    setActionError(null);
    setIsMutating(true);
    try {
      await onVerifyRequest(req.id, currentUser.name);
      setShowRejectBox(false);
      setActionBanner(
        `Permohonan ${req.trackingCode} (${req.companyName}) telah diverifikasi dan slot dikunci.`
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? `Gagal memverifikasi permohonan: ${err.message}`
          : 'Gagal memverifikasi permohonan. Coba lagi.'
      );
    } finally {
      setIsMutating(false);
    }
  };

  const handleConfirmReject = async (
    req: SamplingRequest,
    reasonText: string,
    source: 'verification' | 'kaji-ulang'
  ) => {
    const cleanReason = reasonText.trim();
    if (!cleanReason) {
      setActionError('Isi alasan revisi / jadwal ulang terlebih dahulu.');
      return;
    }
    setActionError(null);
    setIsMutating(true);
    try {
      await onRejectRequest(req.id, cleanReason, currentUser.name);
      if (source === 'verification') {
        setRejectReason('');
        setShowRejectBox(false);
      } else {
        setKajiRejectReason('');
        setShowKajiRejectBox(false);
      }
      setActionBanner(
        `Permohonan ${req.trackingCode} dikembalikan untuk revisi jadwal / berkas pelanggan.`
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? `Gagal mengirim permintaan revisi: ${err.message}`
          : 'Gagal mengirim permintaan revisi. Coba lagi.'
      );
    } finally {
      setIsMutating(false);
    }
  };

  const handleApproveKajiUlangSubmit = async (req: SamplingRequest) => {
    const team =
      samplerTeams.find((t) => t.id === selectedSamplerId) ??
      samplerTeams[0] ??
      SAMPLER_TEAMS[0];
    const reviewedAt = formatNowTimestamp();

    setActionError(null);
    setIsMutating(true);
    try {
      await onApproveKajiUlang(req.id, {
        methodAvailable,
        equipmentCalibrated,
        consumablesReady,
        personnelCompetent,
        assignedSamplerId: team.id,
        assignedSamplerName: team.name,
        reviewerName: currentUser.name,
        reviewedAt,
        technicalNotes: technicalNotes.trim(),
        decision: 'PASS',
      });
      setShowKajiRejectBox(false);
      setActionBanner(
        `Kaji Ulang ISO 17025 untuk ${req.trackingCode} disetujui. SPK diterbitkan ke ${team.name}.`
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? `Gagal menyetujui Kaji Ulang: ${err.message}`
          : 'Gagal menyimpan pengesahan Kaji Ulang. Coba lagi.'
      );
    } finally {
      setIsMutating(false);
    }
  };

  const handleCalendarUpdate = async (
    date: string,
    patch: Partial<CalendarCapacityDay>,
    successMsg?: string
  ) => {
    setActionError(null);
    setIsMutating(true);
    try {
      await onUpdateCalendarDay(date, patch);
      if (successMsg) setActionBanner(successMsg);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? `Gagal memperbarui kalender ${date}: ${err.message}`
          : 'Gagal memperbarui slot kalender.'
      );
    } finally {
      setIsMutating(false);
    }
  };

  const navItems: { id: AdminNavTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'verification', label: 'Verification Center', icon: ClipboardCheck },
    { id: 'kaji-ulang', label: 'Dokumen Kaji Ulang', icon: FileCheck2 },
    { id: 'calendar', label: 'Jadwal Kalender', icon: CalendarDays },
    { id: 'catalog', label: 'Katalog Baku Mutu', icon: BookOpen },
    { id: 'analytics', label: 'Analytics & Audit', icon: BarChart3 },
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
              Admin &amp; Kaji Ulang Lab
            </p>
            <nav className="mt-2 space-y-1" aria-label="Menu portal admin">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateToTab(item.id)}
                    className={`flex min-h-[42px] w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-400'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.id === 'verification' && pendingReviewCount > 0 && (
                      <span className="font-mono text-xs font-semibold text-amber-400">
                        {pendingReviewCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-800 p-4">
          <div className="px-2 pb-2">
            <p className="truncate text-xs font-semibold text-white">{currentUser.name}</p>
            <p className="truncate text-[11px] text-slate-400">{currentUser.roleTitle}</p>
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
                        navigateToTab(item.id);
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
              <div className="px-2 pb-1">
                <p className="truncate text-xs font-semibold text-white">{currentUser.name}</p>
                <p className="truncate text-[11px] text-slate-400">{currentUser.roleTitle}</p>
              </div>
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
              <span className="text-slate-400">
                {currentUser.roleId === 'executive'
                  ? 'Kepala Balai'
                  : currentUser.roleId === 'technical_manager'
                    ? 'Manajer Teknis'
                    : 'Admin Lab'}
              </span>
              <span className="text-slate-300">/</span>
              <span className="font-display font-semibold text-slate-900 truncate">
                {breadcrumbLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden text-xs text-slate-500 sm:inline">{currentUser.name}</span>
            <button
              type="button"
              onClick={() => navigateToTab('verification')}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Antrean Verifikasi ({pendingReviewCount})</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl space-y-6">
            {actionBanner && (
              <div
                role="status"
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-xs text-emerald-950"
              >
                <span className="font-medium">{actionBanner}</span>
                <button
                  type="button"
                  onClick={() => setActionBanner(null)}
                  className="font-semibold text-emerald-800 hover:underline cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            )}

            {actionError && (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-3.5 text-xs text-rose-900"
              >
                <span className="font-medium">{actionError}</span>
                <button
                  type="button"
                  onClick={() => setActionError(null)}
                  className="font-semibold text-rose-800 hover:underline cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            )}

            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Executive Report Action Bar (PRD Appendix D) */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-6 py-4">
                  <div>
                    <h2 className="font-display text-base font-bold text-slate-900">
                      Ringkasan Operasional &amp; Laporan Manajemen
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Cetak laporan Management Brief statistik sampling dan ekspor transaksi resmi.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        downloadManagementBriefPdf({
                          requests,
                          calendarDays,
                          generatedByName: currentUser.name,
                          generatedByRole: currentUser.roleTitle,
                        })
                      }
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                      <span>Unduh Management Brief (PDF)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadSamplingRequestsCsv(requests)}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                      <span>Ekspor Rekap (CSV)</span>
                    </button>
                  </div>
                </div>

                {/* Management Brief KPIs (PRD Appendix D) */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <p className="text-xs font-medium text-slate-500">Total Permohonan Masuk</p>
                    <p className="mt-2 font-mono text-2xl font-bold text-slate-900">
                      {totalCount}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {rejectedCount} dikembalikan untuk revisi
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <p className="text-xs font-medium text-slate-500">Disetujui (SPK Issued)</p>
                    <p className="mt-2 font-mono text-2xl font-bold text-emerald-700">
                      {approvedCount}{' '}
                      <span className="text-sm font-medium text-slate-500">
                        ({conversionRate}%)
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Konversi SPH ke SPK aktif</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <p className="text-xs font-medium text-slate-500">Pending Verifikasi / Kaji Ulang</p>
                    <p className="mt-2 font-mono text-2xl font-bold text-amber-700">
                      {pendingReviewCount}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Target SLA penyelesaian &lt; 4 jam</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <p className="text-xs font-medium text-slate-500">Estimasi Nilai Kontrak</p>
                    <p className="mt-2 font-mono text-xl font-bold text-slate-900">
                      {formatRupiah(totalContractValue)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Termasuk PPN 11% &amp; mobilisasi</p>
                  </div>
                </div>

                {/* Matrix Utilization + Urgent Queue Split */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                  <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
                    <h2 className="font-display text-base font-bold text-slate-900">
                      Utilisasi Matriks Contoh Uji
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Distribusi titik sampling berdasarkan seluruh permohonan aktif.
                    </p>

                    <div className="mt-5 space-y-4">
                      {matrixCounts.map((item) => (
                        <div key={item.matrix}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-800">{item.matrix}</span>
                            <span className="font-mono text-slate-600">
                              {item.count} titik ({item.pct}%)
                            </span>
                          </div>
                          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-slate-900"
                              style={{ width: `${item.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white lg:col-span-7">
                    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                      <div>
                        <h2 className="font-display text-base font-bold text-slate-900">
                          Antrean Tindak Lanjut Segera
                        </h2>
                        <p className="text-xs text-slate-500">
                          Permohonan berstatus Submitted atau Terverifikasi yang perlu diproses
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateToTab('verification')}
                        className="text-xs font-semibold text-cyan-700 hover:underline cursor-pointer"
                      >
                        Buka Verification Center
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-500">
                            <th className="px-4 py-3">Tracking</th>
                            <th className="px-4 py-3">Perusahaan</th>
                            <th className="px-4 py-3">Jadwal</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {urgentDashboardQueue.map((req) => {
                            const st = STATUS_META[req.status];
                            return (
                              <tr key={req.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                                  {req.trackingCode}
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-800">
                                  {req.companyName}
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-600">
                                  {req.scheduledDate}
                                </td>
                                <td className={`px-4 py-3 font-medium ${st.textClass}`}>
                                  {st.glyph} {req.status}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedReqId(req.id);
                                      navigateToTab(
                                        req.status === 'VERIFIED'
                                          ? 'kaji-ulang'
                                          : 'verification',
                                        req.id
                                      );
                                    }}
                                    className="font-semibold text-cyan-700 hover:underline cursor-pointer"
                                  >
                                    {req.status === 'SUBMITTED'
                                      ? 'Verifikasi'
                                      : req.status === 'VERIFIED'
                                        ? 'Kaji Ulang'
                                        : 'Detail'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'verification' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Left Table */}
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
                        placeholder="Cari kode tracking, perusahaan, atau PJ..."
                        className="min-h-[38px] w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-xs text-slate-900 focus:border-cyan-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
                      {(['ALL', 'SUBMITTED', 'VERIFIED', 'APPROVED', 'REJECTED'] as const).map(
                        (st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setStatusFilter(st)}
                            className={`rounded-md px-2.5 py-1 text-[11px] font-medium cursor-pointer ${
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
                  </div>

                  {filteredRequests.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      Tidak ditemukan permohonan sesuai filter saat ini.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-500">
                            <th className="px-4 py-3">Kode</th>
                            <th className="px-4 py-3">Perusahaan</th>
                            <th className="px-4 py-3">Tanggal</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Nilai SPH</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredRequests.map((req) => {
                            const st = STATUS_META[req.status];
                            const isSelected = selectedRequest?.id === req.id;
                            return (
                              <tr
                                key={req.id}
                                onClick={() => {
                                  handleSelectRequest(req.id);
                                  setShowRejectBox(false);
                                }}
                                className={`cursor-pointer transition-colors ${
                                  isSelected ? 'bg-cyan-50/70' : 'hover:bg-slate-50'
                                }`}
                              >
                                <td className="px-4 py-3.5 font-mono font-semibold text-slate-900">
                                  {req.trackingCode}
                                </td>
                                <td className="px-4 py-3.5">
                                  <p className="font-semibold text-slate-900">{req.companyName}</p>
                                  <p className="text-[11px] text-slate-500">{req.picName}</p>
                                </td>
                                <td className="px-4 py-3.5 font-mono text-slate-600">
                                  {req.scheduledDate}
                                </td>
                                <td className={`px-4 py-3.5 font-medium ${st.textClass}`}>
                                  {st.glyph} {req.status}
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

                {/* Right Inspector */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
                  {selectedRequest ? (
                    <div className="space-y-4">
                      <div className="border-b border-slate-200 pb-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-sm font-bold text-slate-900">
                            {selectedRequest.trackingCode}
                          </span>
                          <span
                            className={`text-xs font-semibold ${
                              STATUS_META[selectedRequest.status].textClass
                            }`}
                          >
                            {STATUS_META[selectedRequest.status].glyph}{' '}
                            {STATUS_META[selectedRequest.status].label}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {selectedRequest.companyName}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-slate-500">
                          NIB: {selectedRequest.nibNumber} · Jadwal: {selectedRequest.scheduledDate}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          PJ: {selectedRequest.picName} ({selectedRequest.picPhone})
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-700">
                          Titik &amp; Parameter Diajukan ({selectedRequest.points.length} titik)
                        </p>
                        <div className="mt-2 space-y-2.5">
                          {selectedRequest.points.map((pt, idx) => (
                            <div
                              key={pt.id}
                              className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs"
                            >
                              <div className="flex justify-between gap-2">
                                <span className="font-semibold text-slate-900">
                                  {idx + 1}. {pt.pointName}
                                </span>
                                <span className="font-mono font-semibold text-slate-900">
                                  {formatRupiah(pt.pointCost)}
                                </span>
                              </div>
                              <p className="mt-0.5 text-slate-600">
                                {pt.matrixType} · {pt.regulationCode}
                              </p>
                              <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                                GPS: {pt.latitude}, {pt.longitude} · Param:{' '}
                                {pt.selectedParameterCodes.join(', ')}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between border-t border-slate-200 pt-3 text-xs">
                        <span className="text-slate-600">Total Penawaran (incl. PPN 11%)</span>
                        <span className="font-mono text-sm font-bold text-slate-900">
                          {formatRupiah(selectedRequest.totalEstimatedCost)}
                        </span>
                      </div>

                      {/* Admin Verification Actions */}
                      <div className="space-y-2.5 border-t border-slate-200 pt-4">
                        {selectedRequest.status === 'REJECTED' && (
                          <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                            <AlertTriangle
                              className="mt-0.5 h-4 w-4 shrink-0 text-rose-700"
                              aria-hidden="true"
                            />
                            <div>
                              <p className="font-semibold">Menunggu Revisi Pelanggan</p>
                              <p className="mt-0.5">
                                {selectedRequest.rejectionReason ||
                                  'Catatan revisi telah dikirim ke pelanggan.'}
                              </p>
                            </div>
                          </div>
                        )}

                        {selectedRequest.status === 'SUBMITTED' && (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                              type="button"
                              disabled={isMutating}
                              onClick={() => handleConfirmVerify(selectedRequest)}
                              className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
                            >
                              <Check className="h-4 w-4" aria-hidden="true" />
                              <span>
                                {isMutating ? 'Memproses...' : 'Verifikasi & Kunci Slot'}
                              </span>
                            </button>
                            <button
                              type="button"
                              disabled={isMutating}
                              onClick={() => setShowRejectBox((prev) => !prev)}
                              className="inline-flex min-h-[42px] items-center justify-center rounded-lg border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60 cursor-pointer"
                            >
                              Minta Revisi Jadwal
                            </button>
                          </div>
                        )}

                        {selectedRequest.status === 'VERIFIED' && (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                              type="button"
                              disabled={isMutating}
                              onClick={() =>
                                navigateToTab('kaji-ulang', selectedRequest.id)
                              }
                              className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-60 cursor-pointer"
                            >
                              <FileCheck2 className="h-4 w-4" aria-hidden="true" />
                              <span>Lanjut ke Kaji Ulang ISO 17025</span>
                            </button>
                            <button
                              type="button"
                              disabled={isMutating}
                              onClick={() => setShowRejectBox((prev) => !prev)}
                              className="inline-flex min-h-[42px] items-center justify-center rounded-lg border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60 cursor-pointer"
                            >
                              Minta Revisi Jadwal
                            </button>
                          </div>
                        )}

                        {showRejectBox &&
                          (selectedRequest.status === 'SUBMITTED' ||
                            selectedRequest.status === 'VERIFIED') && (
                            <div className="space-y-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3.5">
                              <label className="block text-xs font-semibold text-rose-900">
                                Alasan Revisi / Minta Jadwal Ulang
                              </label>
                              <div className="flex flex-wrap gap-1.5">
                                {REVISION_REASON_PRESETS.map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setRejectReason(preset)}
                                    className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-left text-[11px] font-medium text-rose-800 hover:bg-rose-100 cursor-pointer"
                                  >
                                    {preset.split(',')[0]}
                                  </button>
                                ))}
                              </div>
                              <textarea
                                rows={2}
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Tuliskan catatan revisi jadwal, alat, atau koordinat untuk pelanggan..."
                                className="w-full rounded-lg border border-rose-200 bg-white p-2 text-xs text-slate-900 focus:border-rose-400 focus:outline-none"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setShowRejectBox(false)}
                                  className="min-h-[34px] rounded-lg border border-rose-200 bg-white px-3 py-1 text-xs font-medium text-rose-800 hover:bg-rose-100 cursor-pointer"
                                >
                                  Batal
                                </button>
                                <button
                                  type="button"
                                  disabled={!rejectReason.trim() || isMutating}
                                  onClick={() =>
                                    handleConfirmReject(
                                      selectedRequest,
                                      rejectReason,
                                      'verification'
                                    )
                                  }
                                  className="min-h-[34px] rounded-lg bg-rose-700 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-800 disabled:bg-rose-300 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  {isMutating ? 'Mengirim...' : 'Kirim Permintaan Revisi'}
                                </button>
                              </div>
                            </div>
                          )}

                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              setDocPreview({ request: selectedRequest, type: 'sph' })
                            }
                            className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>SPH</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDocPreview({ request: selectedRequest, type: 'kaji-ulang' })
                            }
                            className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>Kaji Ulang</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDocPreview({ request: selectedRequest, type: 'spk' })
                            }
                            className={`inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium cursor-pointer ${
                              selectedRequest.status === 'APPROVED'
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>SPK</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => downloadSphPdf(selectedRequest)}
                            className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-200 cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5 text-cyan-700" aria-hidden="true" />
                            <span>Unduh PDF SPH</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              selectedRequest.status === 'APPROVED'
                                ? downloadSpkPdf(selectedRequest)
                                : downloadKajiUlangPdf(selectedRequest)
                            }
                            className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-200 cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                            <span>
                              {selectedRequest.status === 'APPROVED'
                                ? 'Unduh PDF SPK'
                                : 'Unduh PDF 7.1'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Pilih permohonan dari tabel untuk meninjau rincian.
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'kaji-ulang' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Queue List */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Daftar Permohonan Kaji Ulang
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Pilih permohonan untuk mengisi evaluasi kelayakan teknis Klausul 7.1 ISO/IEC
                    17025:2017.
                  </p>

                  <div className="mt-4 space-y-2.5">
                    {requests.map((req) => {
                      const st = STATUS_META[req.status];
                      const isSelected = activeKajiRequest?.id === req.id;
                      return (
                        <button
                          key={req.id}
                          type="button"
                          onClick={() => handleSelectRequest(req.id)}
                          className={`w-full rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'border-cyan-600 bg-cyan-50/60'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900">
                              {req.trackingCode}
                            </span>
                            <span className={`text-[11px] font-semibold ${st.textClass}`}>
                              {st.glyph} {req.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-medium text-slate-800">
                            {req.companyName}
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                            Jadwal: {req.scheduledDate} · {req.points.length} titik
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Feasibility Review Form */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
                  {activeKajiRequest ? (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                        <div>
                          <p className="font-mono text-xs text-emerald-700">
                            ISO/IEC 17025:2017 · Klausul 7.1 Kaji Ulang Permintaan
                          </p>
                          <h3 className="mt-1 font-display text-lg font-bold text-slate-900">
                            {activeKajiRequest.trackingCode} — {activeKajiRequest.companyName}
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setDocPreview({ request: activeKajiRequest, type: 'kaji-ulang' })
                            }
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Pratinjau 7.1</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadKajiUlangPdf(activeKajiRequest)}
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5 text-cyan-400" />
                            <span>Unduh PDF 7.1</span>
                          </button>
                        </div>
                      </div>

                      {activeKajiRequest.status === 'APPROVED' && activeKajiRequest.kajiUlang ? (
                        <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 text-xs text-emerald-950">
                          <p className="font-display text-sm font-bold text-emerald-900">
                            Kaji Ulang Telah Disahkan &amp; SPK Diterbitkan
                          </p>
                          <p>
                            Tim Bertugas:{' '}
                            <span className="font-semibold">
                              {activeKajiRequest.kajiUlang.assignedSamplerName}
                            </span>
                          </p>
                          <p>
                            Peninjau: {activeKajiRequest.kajiUlang.reviewerName} ·{' '}
                            <span className="font-mono">
                              {activeKajiRequest.kajiUlang.reviewedAt}
                            </span>
                          </p>
                          <p className="text-emerald-800">
                            {activeKajiRequest.kajiUlang.technicalNotes}
                          </p>
                          <div className="flex flex-wrap gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => downloadSpkPdf(activeKajiRequest)}
                              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Unduh Surat Perintah Kerja (SPK PDF)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDocPreview({ request: activeKajiRequest, type: 'spk' })
                              }
                              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 cursor-pointer"
                            >
                              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Pratinjau SPK</span>
                            </button>
                          </div>
                        </div>
                      ) : activeKajiRequest.status === 'REJECTED' ? (
                        <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-5 text-xs text-rose-900">
                          <div className="flex items-start gap-2.5">
                            <AlertTriangle
                              className="mt-0.5 h-4 w-4 shrink-0 text-rose-700"
                              aria-hidden="true"
                            />
                            <div>
                              <p className="font-display text-sm font-bold text-rose-950">
                                Permohonan Dikembalikan untuk Revisi Pelanggan
                              </p>
                              <p className="mt-1">
                                Alasan:{' '}
                                {activeKajiRequest.rejectionReason ||
                                  'Pelanggan diminta melakukan penyesuaian jadwal/berkas.'}
                              </p>
                              <p className="mt-2 text-rose-700">
                                Kaji Ulang ISO 17025 dapat dilanjutkan kembali setelah pelanggan
                                mengajukan ulang jadwal atau revisi titik sampling.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2.5">
                            <p className="text-xs font-semibold text-slate-700">
                              Checklist Kelayakan Teknis Laboratorium
                            </p>
                            {[
                              {
                                label:
                                  '1. Metode uji acuan (SNI / APHA) tersedia dan sesuai permintaan baku mutu',
                                checked: methodAvailable,
                                toggle: () => setMethodAvailable((v) => !v),
                              },
                              {
                                label:
                                  '2. Peralatan pengambilan contoh uji lapangan tersedia dan terkalibrasi',
                                checked: equipmentCalibrated,
                                toggle: () => setEquipmentCalibrated((v) => !v),
                              },
                              {
                                label:
                                  '3. Bahan habis pakai, botol steril, dan pengawet kimia mencukupi',
                                checked: consumablesReady,
                                toggle: () => setConsumablesReady((v) => !v),
                              },
                              {
                                label:
                                  '4. Petugas pengambil contoh bersertifikat BNSP tersedia pada tanggal jadwal',
                                checked: personnelCompetent,
                                toggle: () => setPersonnelCompetent((v) => !v),
                              },
                            ].map((item, idx) => (
                              <label
                                key={idx}
                                className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800"
                              >
                                <input
                                  type="checkbox"
                                  checked={item.checked}
                                  onChange={item.toggle}
                                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                                />
                                <span>{item.label}</span>
                              </label>
                            ))}
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700">
                              Penugasan Tim Sampler Lapangan (Sertifikasi BNSP)
                            </label>
                            <select
                              value={selectedSamplerId}
                              onChange={(e) => setSelectedSamplerId(e.target.value)}
                              className="mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-cyan-600 focus:outline-none"
                            >
                              {samplerTeams.map((team) => (
                                <option key={team.id} value={team.id}>
                                  {team.name} — {team.bnspCert} ({team.specialization})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700">
                              Catatan Kaji Ulang Teknis
                            </label>
                            <textarea
                              rows={3}
                              value={technicalNotes}
                              onChange={(e) => setTechnicalNotes(e.target.value)}
                              className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-900 focus:border-cyan-600 focus:outline-none"
                            />
                          </div>

                          {showKajiRejectBox && (
                            <div className="space-y-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3.5">
                              <label className="block text-xs font-semibold text-rose-900">
                                Alasan Pengembalian / Minta Revisi Jadwal ke Pelanggan
                              </label>
                              <div className="flex flex-wrap gap-1.5">
                                {REVISION_REASON_PRESETS.map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setKajiRejectReason(preset)}
                                    className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-left text-[11px] font-medium text-rose-800 hover:bg-rose-100 cursor-pointer"
                                  >
                                    {preset.split(',')[0]}
                                  </button>
                                ))}
                              </div>
                              <textarea
                                rows={2}
                                value={kajiRejectReason}
                                onChange={(e) => setKajiRejectReason(e.target.value)}
                                placeholder="Tuliskan alasan teknis atau permintaan jadwal ulang untuk pelanggan..."
                                className="w-full rounded-lg border border-rose-200 bg-white p-2 text-xs text-slate-900 focus:border-rose-400 focus:outline-none"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setShowKajiRejectBox(false)}
                                  className="min-h-[34px] rounded-lg border border-rose-200 bg-white px-3 py-1 text-xs font-medium text-rose-800 hover:bg-rose-100 cursor-pointer"
                                >
                                  Batal
                                </button>
                                <button
                                  type="button"
                                  disabled={!kajiRejectReason.trim() || isMutating}
                                  onClick={() =>
                                    handleConfirmReject(
                                      activeKajiRequest,
                                      kajiRejectReason,
                                      'kaji-ulang'
                                    )
                                  }
                                  className="min-h-[34px] rounded-lg bg-rose-700 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-800 disabled:bg-rose-300 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  {isMutating ? 'Mengirim...' : 'Kirim Permintaan Revisi'}
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                            <span className="text-xs text-slate-500">
                              Tindakan ini dicatat permanen pada audit log ISO 17025.
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                disabled={isMutating}
                                onClick={() => setShowKajiRejectBox((prev) => !prev)}
                                className="inline-flex min-h-[42px] items-center justify-center rounded-lg border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60 cursor-pointer"
                              >
                                Minta Revisi Jadwal
                              </button>
                              <button
                                type="button"
                                disabled={
                                  isMutating ||
                                  !(
                                    methodAvailable &&
                                    equipmentCalibrated &&
                                    consumablesReady &&
                                    personnelCompetent
                                  )
                                }
                                onClick={() => handleApproveKajiUlangSubmit(activeKajiRequest)}
                                className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
                              >
                                <Check className="h-4 w-4" aria-hidden="true" />
                                <span>
                                  {isMutating
                                    ? 'Menyimpan...'
                                    : 'Setujui Kaji Ulang & Terbitkan SPK'}
                                </span>
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Tidak ada permohonan yang dipilih.
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'calendar' && (
              <MonthlyScheduleCalendar
                mode="internal"
                calendarDays={calendarDays}
                allRequests={requests}
                isMutating={isMutating}
                onUpdateCalendarDay={handleCalendarUpdate}
                onInspectRequest={(req) => {
                  setSelectedReqId(req.id);
                  navigateToTab(
                    req.status === 'VERIFIED' ? 'kaji-ulang' : 'verification',
                    req.id
                  );
                }}
              />
            )}

            {activeTab === 'catalog' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6">
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Master Katalog Baku Mutu &amp; Tarif Resmi
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Referensi metode SNI dan tarif resmi yang digunakan untuk validasi otomatis.
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
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="px-5 py-3">Kode</th>
                          <th className="px-5 py-3">Parameter Uji</th>
                          <th className="px-5 py-3">Metode Acuan</th>
                          <th className="px-5 py-3">Baku Mutu</th>
                          <th className="px-5 py-3 text-right">Tarif</th>
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

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="font-display text-lg font-bold text-slate-900">
                        Jejak Audit Tidak Dapat Diubah (ISO/IEC 17025 Audit Trail)
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Setiap tindakan verifikasi Admin dan pengesahan Kaji Ulang Manajer Teknis
                        terekam permanen pada tabel <span className="font-mono">audit_logs</span>.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          downloadManagementBriefPdf({
                            requests,
                            calendarDays,
                            generatedByName: currentUser.name,
                            generatedByRole: currentUser.roleTitle,
                          })
                        }
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5 text-cyan-700" aria-hidden="true" />
                        <span>Management Brief (PDF)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          downloadAuditTrailPdf({
                            auditLogs,
                            generatedByName: currentUser.name,
                            generatedByRole: currentUser.roleTitle,
                          })
                        }
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                        <span>Laporan Audit (PDF)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadAuditLogsCsv(auditLogs)}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                        <span>Ekspor CSV</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-500">
                          <th className="px-4 py-3">Waktu</th>
                          <th className="px-4 py-3">Aktor</th>
                          <th className="px-4 py-3">Kode Tracking</th>
                          <th className="px-4 py-3">Aksi</th>
                          <th className="px-4 py-3">Keterangan Audit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                              {log.timestamp}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-900">{log.actorName}</p>
                              <p className="text-[11px] text-slate-500">{log.actorRole}</p>
                            </td>
                            <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                              {log.trackingCode}
                            </td>
                            <td className="px-4 py-3 font-mono font-semibold text-emerald-700">
                              {log.action}
                            </td>
                            <td className="px-4 py-3 text-slate-700">{log.detail}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Seeded & Registered Database Users Directory */}
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-cyan-700" aria-hidden="true" />
                        <h3 className="font-display text-base font-bold text-slate-900">
                          Direktori Pengguna Database (Seeded &amp; Terdaftar)
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Akun internal laboratorium dan profil pelanggan yang tersimpan pada koleksi{' '}
                        <span className="font-mono">users</span> di Cloud Firestore.
                      </p>
                    </div>
                    <span className="font-mono text-xs font-semibold text-slate-600">
                      {usersDirectory.length} akun tercatat
                    </span>
                  </div>

                  {usersDirectory.length === 0 ? (
                    <p className="mt-4 text-xs text-slate-500">
                      Belum ada daftar pengguna yang dimuat untuk sesi peran ini.
                    </p>
                  ) : (
                    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-500">
                            <th className="px-4 py-3">Username</th>
                            <th className="px-4 py-3">Nama &amp; Jabatan</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Peran</th>
                            <th className="px-4 py-3">Instansi / Perusahaan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {usersDirectory.map((usr) => (
                            <tr key={usr.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                                {usr.username || '—'}
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-semibold text-slate-900">{usr.name}</p>
                                <p className="text-[11px] text-slate-500">{usr.roleTitle}</p>
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-600">{usr.email}</td>
                              <td className="px-4 py-3 font-mono font-semibold text-cyan-700">
                                {usr.roleId}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                <p>{usr.companyName}</p>
                                <p className="font-mono text-[11px] text-slate-500">
                                  {usr.nibOrNip}
                                </p>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
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
