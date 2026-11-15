const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';
export const DEFAULT_SIMULATED_DATE = '2026-11-11';

export function parseIsoCalendarDate(isoDate: string): { year: number; month: number; day: number } | null {
  const match = ISO_DATE_PATTERN.exec(isoDate.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function isValidIsoDate(isoDate: string): boolean {
  return parseIsoCalendarDate(isoDate) !== null;
}

export function toUtcEpochDays(isoDate: string): number {
  const parsed = parseIsoCalendarDate(isoDate);
  if (!parsed) {
    throw new Error(`Ngày ISO không hợp lệ: "${isoDate}"`);
  }
  return Math.floor(Date.UTC(parsed.year, parsed.month - 1, parsed.day) / MS_PER_DAY);
}

export function diffCalendarDays(targetIsoDate: string, referenceIsoDate: string): number {
  return toUtcEpochDays(targetIsoDate) - toUtcEpochDays(referenceIsoDate);
}

export function shiftIsoDate(isoDate: string, deltaDays: number): string {
  const parsed = parseIsoCalendarDate(isoDate);
  if (!parsed) {
    throw new Error(`Ngày ISO không hợp lệ: "${isoDate}"`);
  }
  const shifted = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + deltaDays));
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayInTimezone(timezone: string): string {
  const safeTimezone = timezone.trim() || DEFAULT_TIMEZONE;
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: safeTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: DEFAULT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }
}

export function formatIsoTimestampInTimezone(date: Date, timezone: string): string {
  const safeTimezone = timezone.trim() || DEFAULT_TIMEZONE;
  try {
    const parts = new Intl.DateTimeFormat('sv-SE', {
      timeZone: safeTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
    return parts;
  } catch {
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }
}

export function extractDatePart(dateOrTimestamp: string): string {
  return dateOrTimestamp.trim().slice(0, 10);
}

export function roundStockQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function roundConvertedQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export function normalizeVietnameseSearchText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}
