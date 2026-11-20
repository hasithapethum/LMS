import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { LOCALE_COOKIE, resolveLocale } from './locale';

// Locale comes from the NEXT_LOCALE cookie (no URL prefix). Works in pages, Server Actions
// and Route Handlers alike; garbage or regional values ("si-LK") are normalised.
export default getRequestConfig(async () => {
  const locale = resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
