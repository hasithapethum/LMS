import { describe, it, expect } from 'vitest';
import { resolveLocale, LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE } from '@/i18n/locale';

describe('resolveLocale', () => {
  it.each([
    ['en', 'en'], ['si', 'si'], ['si-LK', 'si'], ['SI', 'si'], ['en-GB', 'en'],
    ['fr', 'en'], ['', 'en'], [undefined, 'en'], [null, 'en'], ['<script>', 'en'],
  ])('%s → %s', (raw, expected) => expect(resolveLocale(raw as string | undefined | null)).toBe(expected));

  it('exposes en and si with en default', () => {
    expect(LOCALES).toEqual(['en', 'si']);
    expect(DEFAULT_LOCALE).toBe('en');
  });

  it('uses the NEXT_LOCALE cookie', () => expect(LOCALE_COOKIE).toBe('NEXT_LOCALE'));
});
