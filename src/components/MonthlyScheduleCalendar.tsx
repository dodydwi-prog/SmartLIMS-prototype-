import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Lock,
  Pencil,
  RefreshCw,
  Unlock,
} from 'lucide-react';
import { STATUS_META } from '../data/limsMockDatabase';
import { formatRupiah } from '../data/limsPreviewData';
import {
  CalendarCapacityDay,
  RequestStatus,
  SamplingRequest,
} from '../types/lims';
import {
  GRID_WEEKDAY_HEADERS,
  ID_MONTH_NAMES,
  buildCalendarDayMetadata,
  buildMonthGrid,
  findEarliestBookableCustomerDate,
  formatIndonesianFullDate,
  formatMonthParam,
  getCustomerMinBookingIsoDate,
  getTodayIsoDate,
  parseMonthParam,
  resolveCalendarDay,
} from '../utils/calendarUtils';

type InternalStatusFilter = 'ALL' | 'SUBMITTED' | 'VERIFIED' | 'APPROVED';

interface MonthlyScheduleCalendarProps {
  mode: 'customer' | 'internal';
  calendarDays: CalendarCapacityDay[];
  /** All non-rejected requests in system (used to calculate accurate daily slot usage) */
  allRequests: SamplingRequest[];
  /** Customer mode only: requests owned by the current customer */
  customerRequests?: SamplingRequest[];
  /** Customer mode callbacks */
  onBookDate?: (isoDate: string) => void;
  onReviseRequest?: (req: SamplingRequest) => void;
  onPreviewDocument?: (req: SamplingRequest, docType: 'sph' | 'spk') => void;
  /** Internal mode callbacks */
  isMutating?: boolean;
  onUpdateCalendarDay?: (
    date: string,
    patch: Partial<CalendarCapacityDay>,
    bannerMessage?: string
  ) => Promise<void> | void;
  onInspectRequest?: (req: SamplingRequest) => void;
}

const EVENT_STYLE_BY_STATUS: Record<RequestStatus, string> = {
  APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  VERIFIED: 'border-cyan-200 bg-cyan-50 text-cyan-900',
  SUBMITTED: 'border-amber-200 bg-amber-50 text-amber-900',
  REJECTED: 'border-rose-200 bg-rose-50 text-rose-800',
};

export function MonthlyScheduleCalendar({
  mode,
  calendarDays,
  allRequests,
  customerRequests = [],
  onBookDate,
  onReviseRequest,
  onPreviewDocument,
  isMutating = false,
  onUpdateCalendarDay,
  onInspectRequest,
}: MonthlyScheduleCalendarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const todayIso = getTodayIsoDate();
  const minCustomerBookingIso = getCustomerMinBookingIsoDate();
  const minCustomerBookingLabel = buildCalendarDayMetadata(minCustomerBookingIso).dateLabel;
  const todayDate = useMemo(() => new Date(), []);

  // Default to current month (or ?bulan=YYYY-MM if user navigated & refreshed)
  const initialMonthState = useMemo(() => {
    const parsed = parseMonthParam(searchParams.get('bulan'));
    if (parsed) return parsed;
    return {
      year: todayDate.getFullYear(),
      monthIndex: todayDate.getMonth(),
    };
  }, [searchParams, todayDate]);

  const [viewYear, setViewYear] = useState<number>(initialMonthState.year);
  const [viewMonth, setViewMonth] = useState<number>(initialMonthState.monthIndex);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (mode === 'customer') {
      return findEarliestBookableCustomerDate(calendarDays);
    }
    const t = new Date();
    if (
      initialMonthState.year === t.getFullYear() &&
      initialMonthState.monthIndex === t.getMonth()
    ) {
      return todayIso;
    }
    return `${initialMonthState.year}-${String(initialMonthState.monthIndex + 1).padStart(2, '0')}-01`;
  });

  // Internal-only filters & inline note editing
  const [statusFilter, setStatusFilter] = useState<InternalStatusFilter>('ALL');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  // Keep month synced if user navigates Back/Forward on ?bulan=
  useEffect(() => {
    const parsed = parseMonthParam(searchParams.get('bulan'));
    if (parsed && (parsed.year !== viewYear || parsed.monthIndex !== viewMonth)) {
      setViewYear(parsed.year);
      setViewMonth(parsed.monthIndex);
    }
  }, [searchParams, viewYear, viewMonth]);

  // Reset inline note editor when switching selected day
  useEffect(() => {
    setIsEditingNote(false);
    setNoteDraft('');
  }, [selectedDate]);

  const syncMonthToUrl = (nextYear: number, nextMonth: number) => {
    setViewYear(nextYear);
    setViewMonth(nextMonth);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('bulan', formatMonthParam(nextYear, nextMonth));
    setSearchParams(nextParams, { replace: true });
  };

  const handlePrevMonth = () => {
    const prev = new Date(viewYear, viewMonth - 1, 1);
    syncMonthToUrl(prev.getFullYear(), prev.getMonth());
  };

  const handleNextMonth = () => {
    const next = new Date(viewYear, viewMonth + 1, 1);
    syncMonthToUrl(next.getFullYear(), next.getMonth());
  };

  const handleGoToday = () => {
    const now = new Date();
    syncMonthToUrl(now.getFullYear(), now.getMonth());
    setSelectedDate(
      mode === 'customer'
        ? findEarliestBookableCustomerDate(calendarDays)
        : getTodayIsoDate()
    );
  };

  const handleSelectCell = (isoDate: string, inCurrentMonth: boolean) => {
    setSelectedDate(isoDate);
    if (!inCurrentMonth) {
      const [y, m] = isoDate.split('-').map(Number);
      if (y && m) {
        syncMonthToUrl(y, m - 1);
      }
    }
  };

  const monthGrid = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const monthPrefix = formatMonthParam(viewYear, viewMonth);

  // Map active slot usage per date across ALL non-rejected requests (accurate lab quota)
  const usedSlotsByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const req of allRequests) {
      if (req.status === 'REJECTED') continue;
      map.set(req.scheduledDate, (map.get(req.scheduledDate) ?? 0) + req.points.length);
    }
    return map;
  }, [allRequests]);

  // Visible events per date (privacy-safe for Customer; full & filterable for Internal)
  const visibleEventsByDate = useMemo(() => {
    const source = mode === 'customer' ? customerRequests : allRequests;
    const map = new Map<string, SamplingRequest[]>();
    for (const req of source) {
      if (mode === 'internal') {
        if (statusFilter === 'ALL') {
          if (req.status === 'REJECTED') continue;
        } else if (req.status !== statusFilter) {
          continue;
        }
      }
      const list = map.get(req.scheduledDate) ?? [];
      list.push(req);
      map.set(req.scheduledDate, list);
    }
    return map;
  }, [mode, customerRequests, allRequests, statusFilter]);

  // Monthly KPI summary computed dynamically for the displayed month
  const monthlyStats = useMemo(() => {
    const daysInMonthCells = monthGrid.filter((c) => c.inCurrentMonth);
    let openDaysCount = 0;
    let totalRemainingSlots = 0;
    let lockedDaysCount = 0;
    let nearFullDaysCount = 0;

    for (const cell of daysInMonthCells) {
      const resolved = resolveCalendarDay(cell.isoDate, calendarDays);
      const used = usedSlotsByDate.get(cell.isoDate) ?? 0;
      const remaining = Math.max(0, resolved.maxCapacity - used);

      if (resolved.isLocked) {
        if (!cell.isWeekend || resolved.isConfiguredInDb) {
          lockedDaysCount += 1;
        }
      } else {
        const isEligibleForOpenCount =
          mode === 'customer'
            ? cell.isoDate >= minCustomerBookingIso
            : !cell.isPast;
        if (isEligibleForOpenCount && remaining > 0) {
          openDaysCount += 1;
          totalRemainingSlots += remaining;
        }
      }

      if (!resolved.isLocked && resolved.maxCapacity > 0 && used / resolved.maxCapacity >= 0.75) {
        nearFullDaysCount += 1;
      }
    }

    const monthSource = (mode === 'customer' ? customerRequests : allRequests).filter(
      (r) => r.scheduledDate.startsWith(monthPrefix) && (mode === 'customer' || r.status !== 'REJECTED')
    );
    const totalPointsMonth = monthSource
      .filter((r) => r.status !== 'REJECTED')
      .reduce((sum, r) => sum + r.points.length, 0);

    const upcomingCustomerReq =
      mode === 'customer'
        ? customerRequests
            .filter((r) => r.scheduledDate >= todayIso && r.status !== 'REJECTED')
            .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0] ?? null
        : null;

    return {
      openDaysCount,
      totalRemainingSlots,
      lockedDaysCount,
      nearFullDaysCount,
      monthRequestCount: monthSource.length,
      totalPointsMonth,
      upcomingCustomerReq,
    };
  }, [
    monthGrid,
    calendarDays,
    usedSlotsByDate,
    mode,
    customerRequests,
    allRequests,
    monthPrefix,
    todayIso,
  ]);

  // Selected Day Details
  const selectedDayResolved = useMemo(
    () => resolveCalendarDay(selectedDate, calendarDays),
    [selectedDate, calendarDays]
  );
  const selectedDayIsPast = selectedDate < todayIso;
  const selectedDayWithinLeadWindow =
    selectedDate >= todayIso && selectedDate < minCustomerBookingIso;
  const selectedDayBlockedByLeadTime = selectedDate < minCustomerBookingIso;
  const selectedDayUsed = usedSlotsByDate.get(selectedDate) ?? 0;
  const selectedDayRemaining = selectedDayResolved.isLocked
    ? 0
    : Math.max(0, selectedDayResolved.maxCapacity - selectedDayUsed);
  const selectedDayUtilizationPct =
    selectedDayResolved.maxCapacity > 0
      ? Math.min(100, Math.round((selectedDayUsed / selectedDayResolved.maxCapacity) * 100))
      : 0;
  const selectedDayRequests = useMemo(() => {
    const source = mode === 'customer' ? customerRequests : allRequests;
    return source.filter((r) => r.scheduledDate === selectedDate);
  }, [mode, customerRequests, allRequests, selectedDate]);

  const canCustomerBookSelectedDay =
    !selectedDayBlockedByLeadTime &&
    !selectedDayResolved.isLocked &&
    selectedDayRemaining > 0;

  const yearOptions = useMemo(() => {
    const baseYear = todayDate.getFullYear();
    return [baseYear - 1, baseYear, baseYear + 1, baseYear + 2];
  }, [todayDate]);

  const isViewingCurrentMonth =
    viewYear === todayDate.getFullYear() && viewMonth === todayDate.getMonth();

  return (
    <div className="space-y-6">
      {/* Header & Role-Specific Summary Strip */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              {mode === 'customer'
                ? 'Jadwal Kalender & Ketersediaan Tim Sampler'
                : 'Kalender Operasional & Pengelolaan Kuota Lapangan'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {mode === 'customer'
                ? `Pengajuan sampling minimal H-3 (paling cepat ${minCustomerBookingLabel}). Hari yang sudah lewat, hari ini, dan 2 hari setelah hari ini dinonaktifkan untuk pengajuan baru.`
                : 'Pantau distribusi jadwal perusahaan per hari, kelola kuota titik sampling, dan kunci tanggal saat kalibrasi alat.'}
            </p>
          </div>
          {mode === 'customer' && onBookDate && (
            <button
              type="button"
              onClick={() => onBookDate(canCustomerBookSelectedDay ? selectedDate : '')}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              <span>Ajukan Permohonan Baru</span>
            </button>
          )}
        </div>

        {/* 4-Column Tabular Summary Strip */}
        <div className="grid grid-cols-2 divide-y divide-slate-200 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          {mode === 'customer' ? (
            <>
              <div className="px-5 py-3.5">
                <p className="text-[11px] font-medium text-slate-500">
                  Hari Tersedia ({ID_MONTH_NAMES[viewMonth]})
                </p>
                <p className="mt-1 font-mono text-lg font-bold tabular-nums text-emerald-700">
                  {monthlyStats.openDaysCount} hari
                </p>
              </div>
              <div className="px-5 py-3.5">
                <p className="text-[11px] font-medium text-slate-500">Total Sisa Slot Bulan Ini</p>
                <p className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-900">
                  {monthlyStats.totalRemainingSlots} titik
                </p>
              </div>
              <div className="px-5 py-3.5">
                <p className="text-[11px] font-medium text-slate-500">Jadwal Perusahaan Bulan Ini</p>
                <p className="mt-1 font-mono text-lg font-bold tabular-nums text-cyan-700">
                  {monthlyStats.monthRequestCount} permohonan
                </p>
              </div>
              <div className="px-5 py-3.5">
                <p className="text-[11px] font-medium text-slate-500">Jadwal Terdekat Anda</p>
                <p className="mt-1 truncate font-mono text-sm font-semibold tabular-nums text-slate-900">
                  {monthlyStats.upcomingCustomerReq
                    ? monthlyStats.upcomingCustomerReq.scheduledDate
                    : 'Belum ada'}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="px-5 py-3.5">
                <p className="text-[11px] font-medium text-slate-500">
                  Permohonan ({ID_MONTH_NAMES[viewMonth]})
                </p>
                <p className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-900">
                  {monthlyStats.monthRequestCount} berkas
                </p>
              </div>
              <div className="px-5 py-3.5">
                <p className="text-[11px] font-medium text-slate-500">Total Titik Terjadwal</p>
                <p className="mt-1 font-mono text-lg font-bold tabular-nums text-cyan-700">
                  {monthlyStats.totalPointsMonth} titik
                </p>
              </div>
              <div className="px-5 py-3.5">
                <p className="text-[11px] font-medium text-slate-500">Hari Padat / Penuh (≥75%)</p>
                <p className="mt-1 font-mono text-lg font-bold tabular-nums text-amber-700">
                  {monthlyStats.nearFullDaysCount} hari
                </p>
              </div>
              <div className="px-5 py-3.5">
                <p className="text-[11px] font-medium text-slate-500">Hari Terkunci</p>
                <p className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-700">
                  {monthlyStats.lockedDaysCount} hari
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Split Workspace: Google Calendar Monthly Grid (Left) + Day Inspector (Right) */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        {/* LEFT: Full Monthly Calendar Grid */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white xl:col-span-8">
          {/* Google Calendar-Style Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleGoToday}
                className={`min-h-[38px] rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isViewingCurrentMonth && selectedDate === todayIso
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                Hari Ini
              </button>

              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  aria-label="Bulan sebelumnya"
                  className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-l-lg text-slate-700 transition-colors hover:bg-slate-100 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  aria-label="Bulan berikutnya"
                  className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-r-lg border-l border-slate-200 text-slate-700 transition-colors hover:bg-slate-100 cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Direct Month & Year Selectors */}
              <div className="flex items-center gap-1.5">
                <select
                  aria-label="Pilih bulan"
                  value={viewMonth}
                  onChange={(e) => syncMonthToUrl(viewYear, Number(e.target.value))}
                  className="min-h-[38px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-display text-sm font-bold text-slate-900 focus:border-cyan-600 focus:outline-none cursor-pointer"
                >
                  {ID_MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Pilih tahun"
                  value={viewYear}
                  onChange={(e) => syncMonthToUrl(Number(e.target.value), viewMonth)}
                  className="min-h-[38px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm font-semibold tabular-nums text-slate-800 focus:border-cyan-600 focus:outline-none cursor-pointer"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Internal Mode Status Filter Segmented Control */}
            {mode === 'internal' && (
              <div
                role="group"
                aria-label="Filter status jadwal"
                className="flex items-center gap-1 rounded-lg bg-slate-100 p-1"
              >
                {(
                  [
                    { id: 'ALL', label: 'Semua' },
                    { id: 'SUBMITTED', label: 'Menunggu' },
                    { id: 'VERIFIED', label: 'Verifikasi' },
                    { id: 'APPROVED', label: 'Disetujui' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`min-h-[30px] rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      statusFilter === tab.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 7-Column Weekday Header Row */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/90">
            {GRID_WEEKDAY_HEADERS.map((day) => (
              <div
                key={day.short}
                className={`border-r border-slate-200/70 px-2 py-2.5 text-center text-[11px] font-semibold last:border-r-0 ${
                  day.isWeekend ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                <span className="sm:hidden">{day.short}</span>
                <span className="hidden sm:inline">{day.full}</span>
              </div>
            ))}
          </div>

          {/* 7-Column Day Grid */}
          <div className="grid grid-cols-7 bg-slate-200/80 gap-px">
            {monthGrid.map((cell) => {
              const resolved = resolveCalendarDay(cell.isoDate, calendarDays);
              const used = usedSlotsByDate.get(cell.isoDate) ?? 0;
              const remaining = resolved.isLocked
                ? 0
                : Math.max(0, resolved.maxCapacity - used);
              const utilizationPct =
                resolved.maxCapacity > 0
                  ? Math.min(100, Math.round((used / resolved.maxCapacity) * 100))
                  : 0;
              const dayEvents = visibleEventsByDate.get(cell.isoDate) ?? [];
              const isSelected = selectedDate === cell.isoDate;
              const isBlockedByCustomerLeadTime =
                mode === 'customer' && (cell.isPast || cell.isWithinLeadWindow);
              // Disable cell completely for customer when before H+3 and no personal booking exists on that date
              const isCellDisabled =
                isBlockedByCustomerLeadTime && dayEvents.length === 0;

              const cellBgClass = !cell.inCurrentMonth
                ? isBlockedByCustomerLeadTime
                  ? 'bg-slate-100/70 text-slate-400'
                  : 'bg-slate-50/80 text-slate-400'
                : isSelected
                  ? 'bg-cyan-50/50'
                  : isBlockedByCustomerLeadTime
                    ? 'bg-slate-100/80 text-slate-400'
                    : resolved.isLocked
                      ? 'bg-slate-50/90'
                      : 'bg-white hover:bg-slate-50/80';

              return (
                <button
                  key={cell.isoDate}
                  type="button"
                  disabled={isCellDisabled}
                  onClick={() => handleSelectCell(cell.isoDate, cell.inCurrentMonth)}
                  aria-label={`${formatIndonesianFullDate(cell.isoDate)}, ${
                    isBlockedByCustomerLeadTime
                      ? cell.isPast
                        ? 'Tanggal terlewat, tidak dapat diajukan'
                        : 'Dalam batas H-3, tidak dapat diajukan'
                      : resolved.isLocked
                        ? 'Terkunci'
                        : `${remaining} dari ${resolved.maxCapacity} slot tersisa`
                  }`}
                  aria-pressed={isSelected}
                  className={`group relative flex min-h-[84px] sm:min-h-[110px] flex-col justify-between p-1.5 sm:p-2 text-left transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-600 ${cellBgClass} ${
                    isCellDisabled
                      ? 'cursor-not-allowed opacity-70'
                      : 'cursor-pointer'
                  } ${isSelected ? 'ring-2 ring-inset ring-cyan-600 z-[1]' : ''}`}
                >
                  {/* Top Row: Date Number + Compact Quota/Lock Indicator */}
                  <div className="flex w-full items-start justify-between gap-1">
                    <span
                      className={`inline-flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold tabular-nums ${
                        cell.isToday
                          ? isBlockedByCustomerLeadTime
                            ? 'bg-slate-400 text-white'
                            : 'bg-slate-900 text-white'
                          : !cell.inCurrentMonth || isBlockedByCustomerLeadTime
                            ? 'text-slate-400'
                            : cell.isWeekend
                              ? 'text-slate-500'
                              : 'text-slate-900'
                      }`}
                    >
                      {cell.dayOfMonth}
                    </span>

                    {cell.inCurrentMonth && (
                      <span className="mt-0.5 hidden sm:inline-flex items-center gap-0.5 font-mono text-[10px] font-semibold tabular-nums">
                        {isBlockedByCustomerLeadTime ? (
                          <span className="text-slate-400">
                            {cell.isPast ? 'Lewat' : 'Min. H-3'}
                          </span>
                        ) : resolved.isLocked ? (
                          <span className="inline-flex items-center gap-0.5 text-slate-400">
                            <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                            <span>
                              {cell.isWeekend && !resolved.isConfiguredInDb ? 'Libur' : 'Kunci'}
                            </span>
                          </span>
                        ) : cell.isPast ? (
                          <span className="text-slate-400">Lewat</span>
                        ) : remaining === 0 ? (
                          <span className="text-rose-600">Penuh</span>
                        ) : (
                          <span
                            className={
                              remaining <= 2 ? 'text-amber-700' : 'text-emerald-700'
                            }
                          >
                            {mode === 'customer'
                              ? `${remaining}/${resolved.maxCapacity}`
                              : `${used}/${resolved.maxCapacity}`}
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Middle: Google Calendar-Style Event Bars */}
                  <div className="mt-1.5 flex w-full flex-1 flex-col gap-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((evt) => (
                      <div
                        key={evt.id}
                        className={`truncate rounded border px-1.5 py-0.5 text-[10px] font-medium leading-tight ${EVENT_STYLE_BY_STATUS[evt.status]}`}
                      >
                        <span className="hidden sm:inline">
                          {mode === 'customer'
                            ? `${evt.trackingCode} · ${evt.points.length} ttk`
                            : `${evt.companyName} (${evt.points.length})`}
                        </span>
                        <span className="sm:hidden font-mono">
                          {evt.points.length}t
                        </span>
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="px-1 font-mono text-[10px] font-semibold text-slate-500">
                        +{dayEvents.length - 2} lagi
                      </span>
                    )}

                    {/* Subtle open-slot prompt on desktop when cell has no events */}
                    {cell.inCurrentMonth &&
                      dayEvents.length === 0 &&
                      !isBlockedByCustomerLeadTime &&
                      !resolved.isLocked &&
                      !cell.isPast && (
                        <span className="mt-auto hidden sm:block text-[10px] text-slate-400 group-hover:text-slate-600">
                          {remaining === 0
                            ? 'Slot penuh'
                            : mode === 'customer'
                              ? `${remaining} slot terbuka`
                              : 'Belum ada jadwal'}
                        </span>
                      )}
                  </div>

                  {/* Mobile Compact Indicator */}
                  {cell.inCurrentMonth && (
                    <div className="mt-1 flex items-center justify-between sm:hidden">
                      <span
                        className={`font-mono text-[9px] font-semibold tabular-nums ${
                          isBlockedByCustomerLeadTime || resolved.isLocked || cell.isPast
                            ? 'text-slate-400'
                            : remaining === 0
                              ? 'text-rose-600'
                              : remaining <= 2
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                        }`}
                      >
                        {isBlockedByCustomerLeadTime
                          ? cell.isPast
                            ? '-'
                            : 'H-3'
                          : resolved.isLocked
                            ? 'Tutup'
                            : cell.isPast
                              ? '-'
                              : `${remaining}/${resolved.maxCapacity}`}
                      </span>
                    </div>
                  )}

                  {/* Bottom Utilization Hairline Bar (active days with bookings) */}
                  {cell.inCurrentMonth &&
                    !isBlockedByCustomerLeadTime &&
                    !resolved.isLocked &&
                    used > 0 && (
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full transition-all ${
                            utilizationPct >= 100
                              ? 'bg-rose-500'
                              : utilizationPct >= 75
                                ? 'bg-amber-500'
                                : 'bg-cyan-500'
                          }`}
                          style={{ width: `${utilizationPct}%` }}
                        />
                      </div>
                    )}
                </button>
              );
            })}
          </div>

          {/* Clean Unboxed Legend Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3 text-[11px] text-slate-600 sm:px-5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs border border-emerald-300 bg-emerald-100" />
                <span>Disetujui (SPK)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs border border-cyan-300 bg-cyan-100" />
                <span>Terverifikasi</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs border border-amber-300 bg-amber-100" />
                <span>Menunggu Verifikasi</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-slate-400" aria-hidden="true" />
                <span>Terkunci / Libur</span>
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-500">
              {mode === 'customer'
                ? 'Angka: Sisa / Kapasitas Slot'
                : 'Angka: Terpakai / Kapasitas Slot'}
            </span>
          </div>
        </div>

        {/* RIGHT: Sticky Selected Day Inspector & Controls */}
        <div className="rounded-xl border border-slate-200 bg-white xl:sticky xl:top-20 xl:col-span-4">
          {/* Selected Date Header */}
          <div className="border-b border-slate-200 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] font-medium text-cyan-700">
                  {selectedDate === todayIso ? 'Hari Ini' : 'Rincian Tanggal Dipilih'}
                </p>
                <h3 className="mt-1 font-display text-base font-bold text-slate-900">
                  {formatIndonesianFullDate(selectedDate)}
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-mono">{selectedDate}</span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={`font-semibold ${
                      mode === 'customer' && selectedDayWithinLeadWindow
                        ? 'text-amber-700'
                        : selectedDayIsPast
                          ? 'text-slate-500'
                          : selectedDayResolved.isLocked
                            ? 'text-amber-700'
                            : selectedDayRemaining === 0
                              ? 'text-rose-600'
                              : 'text-emerald-700'
                    }`}
                  >
                    {selectedDayIsPast
                      ? 'Tanggal Berlalu'
                      : mode === 'customer' && selectedDayWithinLeadWindow
                        ? 'Di Luar Batas H-3'
                        : selectedDayResolved.isLocked
                          ? selectedDayResolved.isWeekend && !selectedDayResolved.isConfiguredInDb
                            ? 'Akhir Pekan (Tutup)'
                            : 'Terkunci'
                          : selectedDayRemaining === 0
                            ? 'Kuota Penuh'
                            : 'Slot Tersedia'}
                  </span>
                </div>
              </div>

              {mode === 'internal' && onUpdateCalendarDay && (
                <button
                  type="button"
                  disabled={isMutating}
                  onClick={() =>
                    onUpdateCalendarDay(
                      selectedDate,
                      {
                        dayLabel: selectedDayResolved.dayLabel,
                        dateLabel: selectedDayResolved.dateLabel,
                        maxCapacity: selectedDayResolved.maxCapacity,
                        equipmentNote: selectedDayResolved.equipmentNote,
                        isLocked: !selectedDayResolved.isLocked,
                      },
                      `Tanggal ${selectedDayResolved.dateLabel} ${
                        !selectedDayResolved.isLocked ? 'dikunci' : 'dibuka kembali'
                      }.`
                    )
                  }
                  className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 cursor-pointer ${
                    selectedDayResolved.isLocked
                      ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {selectedDayResolved.isLocked ? (
                    <>
                      <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Buka Slot</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Kunci</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Capacity Utilization Summary */}
            <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 rounded-lg border border-slate-200 bg-slate-50/70">
              <div className="px-3 py-2.5">
                <p className="text-[10px] font-medium text-slate-500">Kapasitas</p>
                <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-slate-900">
                  {selectedDayResolved.maxCapacity} ttk
                </p>
              </div>
              <div className="px-3 py-2.5">
                <p className="text-[10px] font-medium text-slate-500">Terpakai</p>
                <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-cyan-700">
                  {selectedDayUsed} ttk
                </p>
              </div>
              <div className="px-3 py-2.5">
                <p className="text-[10px] font-medium text-slate-500">Sisa Slot</p>
                <p
                  className={`mt-0.5 font-mono text-sm font-bold tabular-nums ${
                    selectedDayRemaining === 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {selectedDayRemaining} ttk
                </p>
              </div>
            </div>

            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full transition-all ${
                  selectedDayResolved.isLocked
                    ? 'bg-slate-300'
                    : selectedDayUtilizationPct >= 100
                      ? 'bg-rose-500'
                      : selectedDayUtilizationPct >= 75
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                }`}
                style={{
                  width: selectedDayResolved.isLocked
                    ? '100%'
                    : `${selectedDayUtilizationPct}%`,
                }}
              />
            </div>

            {/* Internal-Only Daily Capacity Stepper */}
            {mode === 'internal' && onUpdateCalendarDay && (
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs">
                <span className="font-medium text-slate-700">Batas Kuota Harian</span>
                <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
                  <button
                    type="button"
                    disabled={isMutating || selectedDayResolved.maxCapacity <= 1}
                    onClick={() =>
                      onUpdateCalendarDay(
                        selectedDate,
                        {
                          dayLabel: selectedDayResolved.dayLabel,
                          dateLabel: selectedDayResolved.dateLabel,
                          isLocked: selectedDayResolved.isLocked,
                          equipmentNote: selectedDayResolved.equipmentNote,
                          maxCapacity: Math.max(1, selectedDayResolved.maxCapacity - 1),
                        },
                        `Kuota tanggal ${selectedDayResolved.dateLabel} diubah menjadi ${Math.max(
                          1,
                          selectedDayResolved.maxCapacity - 1
                        )} titik.`
                      )
                    }
                    className="h-8 w-8 font-mono text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                    aria-label="Kurangi kuota harian"
                  >
                    -
                  </button>
                  <span className="min-w-[44px] border-x border-slate-200 px-2 text-center font-mono text-xs font-bold tabular-nums text-slate-900">
                    {selectedDayResolved.maxCapacity}
                  </span>
                  <button
                    type="button"
                    disabled={isMutating || selectedDayResolved.maxCapacity >= 25}
                    onClick={() =>
                      onUpdateCalendarDay(
                        selectedDate,
                        {
                          dayLabel: selectedDayResolved.dayLabel,
                          dateLabel: selectedDayResolved.dateLabel,
                          isLocked: selectedDayResolved.isLocked,
                          equipmentNote: selectedDayResolved.equipmentNote,
                          maxCapacity: Math.min(25, selectedDayResolved.maxCapacity + 1),
                        },
                        `Kuota tanggal ${selectedDayResolved.dateLabel} diubah menjadi ${Math.min(
                          25,
                          selectedDayResolved.maxCapacity + 1
                        )} titik.`
                      )
                    }
                    className="h-8 w-8 font-mono text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                    aria-label="Tambah kuota harian"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Equipment Readiness Note */}
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-800">
                Catatan Kesiapan Alat &amp; Tim
              </p>
              {mode === 'internal' && onUpdateCalendarDay && !isEditingNote && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingNote(true);
                    setNoteDraft(selectedDayResolved.equipmentNote);
                  }}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-cyan-700 hover:bg-cyan-50 cursor-pointer"
                >
                  <Pencil className="h-3 w-3" aria-hidden="true" />
                  <span>Ubah</span>
                </button>
              )}
            </div>

            {mode === 'internal' && isEditingNote && onUpdateCalendarDay ? (
              <div className="mt-2 space-y-2">
                <textarea
                  rows={3}
                  maxLength={250}
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Tuliskan catatan alat lapangan, kalibrasi, atau ketersediaan tim BNSP..."
                  className="w-full rounded-lg border border-cyan-500 bg-white p-2.5 text-xs text-slate-900 focus:outline-none"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingNote(false);
                      setNoteDraft('');
                    }}
                    className="min-h-[34px] rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={async () => {
                      await onUpdateCalendarDay(
                        selectedDate,
                        {
                          dayLabel: selectedDayResolved.dayLabel,
                          dateLabel: selectedDayResolved.dateLabel,
                          maxCapacity: selectedDayResolved.maxCapacity,
                          isLocked: selectedDayResolved.isLocked,
                          equipmentNote: noteDraft.trim(),
                        },
                        `Catatan kesiapan alat tanggal ${selectedDayResolved.dateLabel} disimpan.`
                      );
                      setIsEditingNote(false);
                    }}
                    className="inline-flex min-h-[34px] items-center gap-1 rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Simpan</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                {selectedDayResolved.equipmentNote}
              </p>
            )}
          </div>

          {/* Customer Primary Action CTA for Selected Date */}
          {mode === 'customer' && onBookDate && (
            <div className="border-b border-slate-200 px-5 py-4">
              {canCustomerBookSelectedDay ? (
                <button
                  type="button"
                  onClick={() => onBookDate(selectedDate)}
                  className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 cursor-pointer"
                >
                  <CalendarDays className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                  <span>Pesan Slot Tanggal {selectedDayResolved.dateLabel}</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
                  {selectedDayIsPast
                    ? 'Tanggal ini sudah berlalu. Pilih tanggal mendatang minimal H-3 untuk mengajukan sampling.'
                    : selectedDayWithinLeadWindow
                      ? `Pengajuan permohonan sampling hanya dapat dilakukan sebelum H-3 (paling cepat tanggal ${minCustomerBookingLabel}). Hari ini dan 2 hari berikutnya tidak dapat dipilih.`
                      : selectedDayResolved.isLocked
                        ? 'Slot pada tanggal ini sedang dikunci atau akhir pekan. Silakan pilih hari kerja lain yang terbuka.'
                        : 'Kuota tim sampler pada tanggal ini sudah penuh. Silakan pilih tanggal lain dengan sisa slot tersedia.'}
                </div>
              )}
            </div>
          )}

          {/* Scheduled Requests List on Selected Date */}
          <div className="p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-900">
                {mode === 'customer'
                  ? `Jadwal Perusahaan Anda (${selectedDayRequests.length})`
                  : `Daftar Permohonan Terjadwal (${selectedDayRequests.length})`}
              </p>
            </div>

            {selectedDayRequests.length === 0 ? (
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                {mode === 'customer'
                  ? 'Belum ada permohonan sampling dari perusahaan Anda pada tanggal ini.'
                  : 'Belum ada permohonan sampling yang masuk pada tanggal ini.'}
              </p>
            ) : (
              <div className="mt-3 divide-y divide-slate-200 border-t border-slate-200">
                {selectedDayRequests.map((req) => {
                  const st = STATUS_META[req.status];
                  const matrixSummary = Array.from(
                    new Set(req.points.map((p) => p.matrixType))
                  ).join(', ');

                  return (
                    <div key={req.id} className="py-3.5 first:pt-3 last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-bold text-slate-900">
                            {req.trackingCode}
                          </p>
                          {mode === 'internal' && (
                            <p className="mt-0.5 truncate text-xs font-medium text-slate-800">
                              {req.companyName}
                            </p>
                          )}
                        </div>
                        <span className={`shrink-0 text-[11px] font-semibold ${st.textClass}`}>
                          {st.glyph} {st.label}
                        </span>
                      </div>

                      <p className="mt-1.5 text-[11px] text-slate-500">
                        <span className="font-mono font-semibold text-slate-700">
                          {req.points.length} titik
                        </span>
                        <span aria-hidden="true"> · </span>
                        <span>{matrixSummary}</span>
                        {mode === 'customer' && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span className="font-mono">
                              {formatRupiah(req.totalEstimatedCost)}
                            </span>
                          </>
                        )}
                      </p>

                      {mode === 'customer' && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          {req.status === 'REJECTED' && onReviseRequest && (
                            <button
                              type="button"
                              onClick={() => onReviseRequest(req)}
                              className="inline-flex min-h-[32px] items-center gap-1 rounded-md bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-700 cursor-pointer"
                            >
                              <RefreshCw className="h-3 w-3" aria-hidden="true" />
                              <span>Revisi Jadwal</span>
                            </button>
                          )}
                          {onPreviewDocument && (
                            <>
                              <button
                                type="button"
                                onClick={() => onPreviewDocument(req, 'sph')}
                                className="inline-flex min-h-[32px] items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                <FileText className="h-3 w-3" aria-hidden="true" />
                                <span>SPH</span>
                              </button>
                              {req.status === 'APPROVED' && (
                                <button
                                  type="button"
                                  onClick={() => onPreviewDocument(req, 'spk')}
                                  className="inline-flex min-h-[32px] items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                                >
                                  <FileCheck2 className="h-3 w-3" aria-hidden="true" />
                                  <span>SPK</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {mode === 'internal' && onInspectRequest && (
                        <div className="mt-2.5">
                          <button
                            type="button"
                            onClick={() => onInspectRequest(req)}
                            className="inline-flex min-h-[32px] items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-900 hover:text-white transition-colors cursor-pointer"
                          >
                            <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>
                              {req.status === 'VERIFIED'
                                ? 'Buka Kaji Ulang ISO 17025'
                                : 'Tinjau di Verification Center'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
