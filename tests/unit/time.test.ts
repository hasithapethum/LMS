import { describe, it, expect } from 'vitest';
import {
  APP_TIME_ZONE, isMonthKey, monthKeyOf, addMonths, startOfMonthInstant, paymentDayInstant,
  accessWindow, isWithinAccessWindow, payableMonths, formatInColombo, parseColomboDateTime,
} from '@/lib/time';

const at = (iso: string) => new Date(iso);

describe('host TZ guard', () => {
  it('runs under a non-Colombo host zone', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/New_York');
    expect(APP_TIME_ZONE).toBe('Asia/Colombo');
  });
});

describe('isMonthKey', () => {
  it.each(['2026-01', '2026-12'])('accepts %s', (v) => expect(isMonthKey(v)).toBe(true));
  it.each(['2026-13', '2026-00', '2026-1', '26-01', '2026/01', ''])('rejects %s', (v) =>
    expect(isMonthKey(v)).toBe(false));
});

describe('monthKeyOf', () => {
  it('30 Nov 23:59:59 Colombo is still November', () =>
    expect(monthKeyOf(at('2026-11-30T18:29:59Z'))).toBe('2026-11'));
  it('1 Dec 00:00 Colombo is December', () =>
    expect(monthKeyOf(at('2026-11-30T18:30:00Z'))).toBe('2026-12'));
  it('New Year in Colombo', () =>
    expect(monthKeyOf(at('2026-12-31T18:30:00Z'))).toBe('2027-01'));
});

describe('addMonths', () => {
  it('rolls over the year', () => expect(addMonths('2026-12', 1)).toBe('2027-01'));
  it('goes backwards across the year', () => expect(addMonths('2027-01', -1)).toBe('2026-12'));
  it('adds more than 12', () => expect(addMonths('2026-11', 14)).toBe('2028-01'));
  it('rejects a bad month key', () => expect(() => addMonths('2026-13', 1)).toThrow(RangeError));
});

describe('instants', () => {
  it('start of December in Colombo', () =>
    expect(startOfMonthInstant('2026-12').toISOString()).toBe('2026-11-30T18:30:00.000Z'));
  it('payment day 10 of December', () =>
    expect(paymentDayInstant('2026-12', 10).toISOString()).toBe('2026-12-09T18:30:00.000Z'));
  it.each([0, 29, 10.5, -1])('rejects payment day %s', (d) =>
    expect(() => paymentDayInstant('2026-12', d)).toThrow(RangeError));
});

describe('access window (paid month M → payment day of M+1)', () => {
  it('November paid, payment day 10', () => {
    const w = accessWindow('2026-11', 10);
    expect(w.start.toISOString()).toBe('2026-10-31T18:30:00.000Z');
    expect(w.end.toISOString()).toBe('2026-12-09T18:30:00.000Z');
  });
  it('December paid rolls into January', () =>
    expect(accessWindow('2026-12', 1).end.toISOString()).toBe('2026-12-31T18:30:00.000Z'));
  it('inside one second before the end', () =>
    expect(isWithinAccessWindow('2026-11', 10, at('2026-12-09T18:29:59Z'))).toBe(true));
  it('outside exactly at the end', () =>
    expect(isWithinAccessWindow('2026-11', 10, at('2026-12-09T18:30:00Z'))).toBe(false));
  it('outside one second before the start', () =>
    expect(isWithinAccessWindow('2026-11', 10, at('2026-10-31T18:29:59Z'))).toBe(false));
  it('inside exactly at the start', () =>
    expect(isWithinAccessWindow('2026-11', 10, at('2026-10-31T18:30:00Z'))).toBe(true));
});

describe('payableMonths', () => {
  it('current + 2 ahead across the year', () =>
    expect(payableMonths(at('2026-12-15T00:00:00Z'))).toEqual(['2026-12', '2027-01', '2027-02']));
  it('uses Colombo month at the boundary', () =>
    expect(payableMonths(at('2026-11-30T18:30:00Z'), 0)).toEqual(['2026-12']));
});

describe('formatInColombo', () => {
  const dec1 = at('2026-11-30T18:30:00Z');
  it('English month name in Colombo time', () =>
    expect(formatInColombo(dec1, 'en', { month: 'long' })).toBe('December'));
  it('Sinhala month name', () =>
    expect(formatInColombo(dec1, 'si', { month: 'long' })).toBe('දෙසැම්බර්'));
  it('day number in Colombo time', () =>
    expect(formatInColombo(dec1, 'en', { day: 'numeric' })).toBe('1'));
  // ICU 78 uses traditional lunar names (e.g. "උඳුවප්") for Gregorian months; Sri Lankan
  // schools use the transliterated names, and browsers ship other ICU versions.
  it('Sinhala full date uses the common Gregorian month name', () =>
    expect(formatInColombo(dec1, 'si', { day: 'numeric', month: 'long', year: 'numeric' }))
      .toBe('2026 දෙසැම්බර් 1'));
  it.each(['full', 'long', 'medium'] as const)('Sinhala dateStyle %s uses the common month name', (dateStyle) => {
    const text = formatInColombo(dec1, 'si', { dateStyle });
    expect(text).toContain('දෙසැම්බර්');
    expect(text).not.toContain('උඳුවප්');
  });
  it('Sinhala dateStyle short stays numeric', () =>
    expect(formatInColombo(dec1, 'si', { dateStyle: 'short' })).toBe('2026-12-01'));
  it('Sinhala narrow month uses the common month name', () =>
    expect(formatInColombo(dec1, 'si', { month: 'narrow' })).toBe('දෙසැම්බර්'));
  it('Sinhala April keeps its zero-width joiner', () =>
    expect(formatInColombo(at('2026-04-15T00:00:00Z'), 'si', { month: 'short' })).toBe('අප්‍රේල්'));
});

describe('parseColomboDateTime', () => {
  it('reads datetime-local as Colombo time', () =>
    expect(parseColomboDateTime('2026-12-01T00:00').toISOString()).toBe('2026-11-30T18:30:00.000Z'));
  it.each(['', '2026-12-01', '2026-13-01T00:00', 'yesterday'])('rejects %s', (v) =>
    expect(() => parseColomboDateTime(v)).toThrow(RangeError));
});
