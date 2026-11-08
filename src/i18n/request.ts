import * as rootParams from 'next/root-params';
import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';
import {hasLocale} from 'next-intl';
import {routing} from './routing';

// The locale comes from the root segment app/[locale] through next/root-params, which keeps
// pages compatible with cacheComponents (no headers()/cookies() during rendering).
// Server Actions and Route Handlers have no root params: pass the locale explicitly there,
// e.g. getTranslations({locale, namespace}).
export default getRequestConfig(async ({locale}) => {
  if (!locale) {
    const param = await rootParams.locale();
    if (hasLocale(routing.locales, param)) {
      locale = param;
    } else {
      notFound();
    }
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // Time zone for system timestamps (created at, updated at).
    // The event's date and time are wall-clock values formatted in UTC; see dates.ts.
    timeZone: 'America/Sao_Paulo',
  };
});
