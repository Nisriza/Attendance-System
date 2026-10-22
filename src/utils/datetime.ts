export const ATTENDANCE_TIME_ZONE = 'Asia/Kuala_Lumpur';
export const FILTER_START_YEAR = 2026;

export function attendanceDayKey(value: string | Date = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ATTENDANCE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

const monthKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: ATTENDANCE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
});

export function attendanceMonthKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = monthKeyFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  return year && month ? `${year}-${month}` : '';
}

export function isInMonthYear(
  value: string | Date,
  month: string,
  year: string
): boolean {
  if (month === 'all' && year === 'all') return true;
  const key = attendanceMonthKey(value);
  if (!key) return false;
  const [recordYear, recordMonth] = key.split('-');
  if (year !== 'all' && recordYear !== year) return false;
  if (month !== 'all' && recordMonth !== month) return false;
  return true;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function monthYearLabel(month: string, year: string): string {
  if (month === 'all' && year === 'all') return 'All time';
  if (month === 'all') return year;
  const monthName = MONTH_NAMES[Number(month) - 1] || '';
  return year === 'all' ? monthName : `${monthName} ${year}`;
}

export function filterYearOptions(latestYear?: number): number[] {
  const currentYear = new Date().getFullYear();
  const lastYear = Math.max(FILTER_START_YEAR, currentYear, latestYear || 0);
  return Array.from(
    { length: lastYear - FILTER_START_YEAR + 1 },
    (_, index) => FILTER_START_YEAR + index
  );
}

export { MONTH_NAMES };
