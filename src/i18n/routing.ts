import { defineRouting } from 'next-intl/routing';
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES } from './locale';

/**
 * URLs carry no locale prefix. `proxy.ts` rewrites each request to an internal
 * `/[locale]` segment chosen from the NEXT_LOCALE cookie, so pages can still be
 * prerendered per language under Cache Components.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'never',
  localeCookie: { name: LOCALE_COOKIE, maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' },
  alternateLinks: false,
});
