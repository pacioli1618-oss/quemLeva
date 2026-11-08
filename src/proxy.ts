import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

// Picks the locale (QL_LOCALE cookie → Accept-Language → pt-BR) and rewrites the request
// to /<locale>/..., without changing the URL the person sees.
export default createMiddleware(routing);

export const config = {
  // Everything except API routes, Next internals and files with an extension (images, icons).
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
