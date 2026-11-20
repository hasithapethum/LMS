import type { AppLocale } from '@/lib/time';

export const LOCALES = ['en', 'si'] as const satisfies readonly AppLocale[];
export const DEFAULT_LOCALE: AppLocale = 'en';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

/** Map any raw value (cookie, header, segment) to a supported locale. `si-LK` → `si`. */
export function resolveLocale(raw: string | undefined | null): AppLocale {
  const language = (raw ?? '').trim().toLowerCase().split('-')[0];
  return (LOCALES as readonly string[]).includes(language) ? (language as AppLocale) : DEFAULT_LOCALE;
}
