import { TZDate } from '@date-fns/tz';

/**
 * All business time logic (months, payment days, access windows, schedules)
 * runs in Sri Lanka time, never in the host machine's zone.
 */
export const APP_TIME_ZONE = 'Asia/Colombo' as const;

/** A calendar month as `YYYY-MM`, e.g. `2026-11`. */
export type MonthKey = string;

export type AppLocale = 'en' | 'si';

const MONTH_KEY_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATETIME_LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const INTL_LOCALE: Record<AppLocale, string> = { en: 'en-LK', si: 'si-LK' };

const pad2 = (n: number) => String(n).padStart(2, '0');

export function isMonthKey(value: string): value is MonthKey {
  return MONTH_KEY_RE.test(value);
}

function parseMonthKey(month: MonthKey): { year: number; month: number } {
  const match = MONTH_KEY_RE.exec(month);
  if (!match) throw new RangeError(`Invalid month key: "${month}" (expected YYYY-MM)`);
  return { year: Number(match[1]), month: Number(match[2]) };
}

/** Colombo wall-clock time → UTC instant as a plain Date. */
function colomboInstant(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(new TZDate(year, month - 1, day, hour, minute, 0, 0, APP_TIME_ZONE).getTime());
}

export function monthKeyOf(instant: Date): MonthKey {
  const zoned = new TZDate(instant.getTime(), APP_TIME_ZONE);
  return `${zoned.getFullYear()}-${pad2(zoned.getMonth() + 1)}`;
}

export function addMonths(month: MonthKey, n: number): MonthKey {
  const { year, month: m } = parseMonthKey(month);
  const index = year * 12 + (m - 1) + n;
  return `${Math.floor(index / 12)}-${pad2((index % 12) + 1)}`;
}

/** 00:00 Colombo on the 1st of the month. */
export function startOfMonthInstant(month: MonthKey): Date {
  const { year, month: m } = parseMonthKey(month);
  return colomboInstant(year, m, 1);
}

/** 00:00 Colombo on `paymentDay` (integer 1–28) of the month. */
export function paymentDayInstant(month: MonthKey, paymentDay: number): Date {
  if (!Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 28) {
    throw new RangeError(`paymentDay must be an integer 1–28, got ${paymentDay}`);
  }
  const { year, month: m } = parseMonthKey(month);
  return colomboInstant(year, m, paymentDay);
}

/**
 * Access bought for month M runs from the start of M (inclusive)
 * until the class payment day of M+1 (exclusive).
 */
export function accessWindow(paidMonth: MonthKey, paymentDay: number): { start: Date; end: Date } {
  return {
    start: startOfMonthInstant(paidMonth),
    end: paymentDayInstant(addMonths(paidMonth, 1), paymentDay),
  };
}

export function isWithinAccessWindow(paidMonth: MonthKey, paymentDay: number, now: Date): boolean {
  const { start, end } = accessWindow(paidMonth, paymentDay);
  const t = now.getTime();
  return t >= start.getTime() && t < end.getTime();
}

/** The current Colombo month followed by `ahead` future months. */
export function payableMonths(now: Date, ahead = 2): MonthKey[] {
  const current = monthKeyOf(now);
  return Array.from({ length: ahead + 1 }, (_, i) => addMonths(current, i));
}

/**
 * Sinhala Gregorian month names as used in Sri Lankan schools and exam timetables.
 * ICU 78+ returns traditional lunar names (දුරුතු … උඳුවප්) instead, and browsers ship
 * different ICU versions, so text months are always taken from this table.
 */
const SI_MONTHS = [
  'ජනවාරි', 'පෙබරවාරි', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජූනි',
  'ජූලි', 'අගෝස්තු', 'සැප්තැම්බර්', 'ඔක්තෝබර්', 'නොවැම්බර්', 'දෙසැම්බර්',
] as const;

export function formatInColombo(
  instant: Date,
  locale: AppLocale,
  options: Intl.DateTimeFormatOptions,
): string {
  const formatter = new Intl.DateTimeFormat(INTL_LOCALE[locale], { ...options, timeZone: APP_TIME_ZONE });
  const textMonth = options.month === 'long' || options.month === 'short';
  if (locale !== 'si' || !textMonth) return formatter.format(instant);

  const monthIndex = new TZDate(instant.getTime(), APP_TIME_ZONE).getMonth();
  return formatter
    .formatToParts(instant)
    .map((part) => (part.type === 'month' ? SI_MONTHS[monthIndex] : part.value))
    .join('');
}

/** Parse `YYYY-MM-DDTHH:mm` (an `<input type="datetime-local">` value) as Colombo time. */
export function parseColomboDateTime(local: string): Date {
  const match = DATETIME_LOCAL_RE.exec(local);
  if (!match) throw new RangeError(`Invalid date-time: "${local}" (expected YYYY-MM-DDTHH:mm)`);
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth || hour > 23 || minute > 59) {
    throw new RangeError(`Invalid date-time: "${local}"`);
  }
  return colomboInstant(year, month, day, hour, minute);
}
