'use server';

import { cookies } from 'next/headers';
import { LOCALE_COOKIE, resolveLocale } from '@/i18n/locale';
import type { AppLocale } from '@/lib/time';

export async function setLocale(locale: AppLocale): Promise<void> {
  // Server action input is untrusted: only ever store a supported locale.
  (await cookies()).set(LOCALE_COOKIE, resolveLocale(locale), {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    path: '/',
  });
}
