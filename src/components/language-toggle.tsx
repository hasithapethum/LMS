'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { setLocale } from '@/app/actions/locale';
import type { AppLocale } from '@/lib/time';

const OPTIONS = [
  { locale: 'en', label: 'EN', nameKey: 'english' },
  { locale: 'si', label: 'සිං', nameKey: 'sinhala' },
] as const;

export function LanguageToggle() {
  const active = useLocale() as AppLocale;
  const t = useTranslations('common');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const choose = (next: AppLocale) => {
    if (next === active) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  };

  return (
    <div role="group" aria-label={t('language')} className="inline-flex rounded-[10px] border border-border bg-card p-1">
      {OPTIONS.map(({ locale, label, nameKey }) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          aria-label={t(nameKey)}
          aria-pressed={active === locale}
          disabled={pending}
          onClick={() => choose(locale)}
          className="min-h-11 min-w-11 rounded-md px-3 text-sm font-semibold text-muted-foreground transition-colors aria-pressed:bg-primary aria-pressed:text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
