import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Skip API routes (uploads must never be buffered by the proxy), Next internals and files.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
