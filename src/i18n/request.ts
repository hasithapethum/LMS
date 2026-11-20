import { locale as rootLocale } from 'next/root-params';
import { getRequestConfig } from 'next-intl/server';
import { resolveLocale } from './locale';

export default getRequestConfig(async () => {
  const locale = resolveLocale(await rootLocale());
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
