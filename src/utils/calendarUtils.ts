import { CalendarCapacityDay } from '../types/lims';

export const ID_MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

export const ID_MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

export const ID_WEEKDAY_SHORT_SUN_FIRST = [
  'Min',
  'Sen',
  'Sel',
  'Rab',
  'Kam',
  'Jum',
  'Sab',
] as const;

export const ID_WEEKDAY_LONG_SUN_FIRST = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
] as const;

// Monday-first grid headers (standard Indonesian workweek / ISO 8601)
export const GRID_WEEKDAY_HEADERS = [
  { short: 'Sen', full: 'Senin', isWeekend: false },
  { short: 'Sel', full: 'Selasa', isWeekend: false },
  { short: 'Rab', full: 'Rabu', isWeekend: false },
  { short: 'Kam', full: 'Kamis', isWeekend: false },
  { short: 'Jum', full: 'Jumat', isWeekend: false },
  { short: 'Sab', full: 'Sabtu', isWeekend: true },
  { short: 'Min', full: 'Minggu', isWeekend: true },
] as const;

export const CUSTOMER_MIN_LEAD_DAYS = 3;

export function toIsoDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayIsoDate(): string {
  return toIsoDateString(new Date());
}

export function addDaysIso(isoDate: string, days: number): string {
  const base = parseIsoDate(isoDate);
  base.setDate(base.getDate() + days);
  return toIsoDateString(base);
}

/**
 * Earliest sampling date a customer is allowed to request (H-3 lead time:
 * past dates, today, +1 day, and +2 days after today are disabled).
 */
export function getCustomerMinBookingIsoDate(): string {
  return addDaysIso(getTodayIsoDate(), CUSTOMER_MIN_LEAD_DAYS);
}

export function isDateBeforeCustomerLeadTime(isoDate: string): boolean {
  return isoDate < getCustomerMinBookingIsoDate();
}

export function parseIsoDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y || 2026, (m || 1) - 1, d || 1);
}

export function formatIndonesianFullDate(isoDate: string): string {
  const d = parseIsoDate(isoDate);
  const weekday = ID_WEEKDAY_LONG_SUN_FIRST[d.getDay()];
  const month = ID_MONTH_NAMES[d.getMonth()];
  return `${weekday}, ${d.getDate()} ${month} ${d.getFullYear()}`;
}

export function buildCalendarDayMetadata(isoDate: string): {
  dayLabel: string;
  dateLabel: string;
  isWeekend: boolean;
} {
  const d = parseIsoDate(isoDate);
  const dow = d.getDay();
  return {
    dayLabel: ID_WEEKDAY_SHORT_SUN_FIRST[dow],
    dateLabel: `${d.getDate()} ${ID_MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`,
    isWeekend: dow === 0 || dow === 6,
  };
}

/**
 * Resolves a YYYY-MM-DD date against configured Firestore calendar_days records.
 * Any unconfigured weekday defaults to 6 slots (open); weekends default to locked.
 */
export function resolveCalendarDay(
  isoDate: string,
  calendarDays: CalendarCapacityDay[]
): CalendarCapacityDay & { isWeekend: boolean; isConfiguredInDb: boolean } {
  const meta = buildCalendarDayMetadata(isoDate);
  const existing = calendarDays.find((c) => c.date === isoDate);

  if (existing) {
    return {
      ...existing,
      isWeekend: meta.isWeekend,
      isConfiguredInDb: true,
    };
  }

  return {
    date: isoDate,
    dayLabel: meta.dayLabel,
    dateLabel: meta.dateLabel,
    maxCapacity: meta.isWeekend ? 2 : 6,
    isLocked: meta.isWeekend,
    equipmentNote: meta.isWeekend
      ? 'Akhir pekan — operasional tim sampling reguler libur (buka manual jika ada penugasan khusus).'
      : 'Paket Standar Air Limbah, Udara Ambien, & Air Bersih (Tim Sampler BNSP Siap).',
    isWeekend: meta.isWeekend,
    isConfiguredInDb: false,
  };
}

/**
 * Finds the earliest unlocked date starting at H+3 (scanning up to 30 days ahead).
 */
export function findEarliestBookableCustomerDate(
  calendarDays: CalendarCapacityDay[],
  usedSlotsLookup?: (isoDate: string) => number
): string {
  const minDate = getCustomerMinBookingIsoDate();
  for (let offset = 0; offset < 30; offset++) {
    const candidate = addDaysIso(minDate, offset);
    const resolved = resolveCalendarDay(candidate, calendarDays);
    const used = usedSlotsLookup ? usedSlotsLookup(candidate) : 0;
    if (!resolved.isLocked && resolved.maxCapacity - used > 0) {
      return candidate;
    }
  }
  return minDate;
}

export interface MonthGridCell {
  isoDate: string;
  dayOfMonth: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  /** True for today (H+0), H+1, and H+2 (blocked by customer H-3 rule) */
  isWithinLeadWindow: boolean;
  isWeekend: boolean;
}

/**
 * Builds a complete Monday-first calendar grid (35 or 42 cells) for a given year & 0-indexed month.
 */
export function buildMonthGrid(year: number, monthIndex: number): MonthGridCell[] {
  const todayIso = getTodayIsoDate();
  const minBookingIso = getCustomerMinBookingIsoDate();
  const firstOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  // Convert Sunday=0..Saturday=6 to Monday=0..Sunday=6
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const totalCells = startOffset + daysInMonth > 35 ? 42 : 35;

  const cells: MonthGridCell[] = [];
  for (let idx = 0; idx < totalCells; idx++) {
    const cellDate = new Date(year, monthIndex, 1 - startOffset + idx);
    const isoDate = toIsoDateString(cellDate);
    const dow = cellDate.getDay();

    cells.push({
      isoDate,
      dayOfMonth: cellDate.getDate(),
      inCurrentMonth:
        cellDate.getFullYear() === year && cellDate.getMonth() === monthIndex,
      isToday: isoDate === todayIso,
      isPast: isoDate < todayIso,
      isWithinLeadWindow: isoDate >= todayIso && isoDate < minBookingIso,
      isWeekend: dow === 0 || dow === 6,
    });
  }

  return cells;
}

export function formatMonthParam(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

export function parseMonthParam(
  param: string | null
): { year: number; monthIndex: number } | null {
  if (!param || !/^\d{4}-\d{2}$/.test(param)) return null;
  const [y, m] = param.split('-').map(Number);
  if (!y || !m || m < 1 || m > 12 || y < 2020 || y > 2035) return null;
  return { year: y, monthIndex: m - 1 };
}
