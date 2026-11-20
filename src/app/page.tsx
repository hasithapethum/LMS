import { getTranslations } from 'next-intl/server';
import { LanguageToggle } from '@/components/language-toggle';
import { Button } from '@/components/ui/button';

export default async function HomePage() {
  const t = await getTranslations('home');

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex justify-end">
        <LanguageToggle />
      </div>
      <h1 className="text-2xl/8 font-bold text-navy-900 dark:text-foreground">{t('title')}</h1>
      <Button size="lg" className="h-11 w-full rounded-[10px] text-base sm:w-auto">
        {t('cta')}
      </Button>
    </main>
  );
}
