export const ATTENDANCE_TIME_ZONE = 'Asia/Kuala_Lumpur';

function dateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function todayKey(timeZone: string = ATTENDANCE_TIME_ZONE): string {
  return dateKeyInTimeZone(new Date(), timeZone);
}

export function isSameAttendanceDay(
  timestamp: string | undefined,
  dayKey: string = todayKey()
): boolean {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return false;
  return dateKeyInTimeZone(date, ATTENDANCE_TIME_ZONE) === dayKey;
}
