import type {Metadata} from 'next';
import {NextIntlClientProvider} from 'next-intl';
import {getLocale, getTranslations} from 'next-intl/server';
import localFont from 'next/font/local';
import {routing} from '@/i18n/routing';
import '../globals.css';

// Plus Jakarta Sans served by the app itself (OFL license in app/fonts/OFL.txt):
// opening an event link makes no request to Google.
const jakarta = localFont({
  src: '../fonts/PlusJakartaSans-Variable.woff2',
  weight: '200 800',
  variable: '--font-jakarta',
  display: 'swap',
});

// With cacheComponents, every root param needs at least one value at build time.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return {title: t('title'), description: t('description')};
}

export default async function LocaleLayout({children}: LayoutProps<'/[locale]'>) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={jakarta.variable}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
