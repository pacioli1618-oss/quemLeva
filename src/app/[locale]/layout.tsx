import type {Metadata, Viewport} from 'next';
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

// Absolute base for preview images (og:image must be absolute). On Vercel, Next falls back to
// the production domain on its own; NEXT_PUBLIC_SITE_URL overrides it (docs/deploy.md).
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('Metadata');
  const image = {url: `/api/og?locale=${locale}`, width: 1200, height: 630, alt: t('title')};
  return {
    metadataBase: siteUrl ? new URL(siteUrl) : undefined,
    title: t('title'),
    description: t('description'),
    openGraph: {title: t('title'), description: t('description'), siteName: 'QuemLeva', type: 'website', images: [image]},
    twitter: {card: 'summary_large_image', title: t('title'), description: t('description'), images: [image]},
    // Home-screen app on iPhone (Android reads app/manifest.ts).
    appleWebApp: {capable: true, title: 'QuemLeva', statusBarStyle: 'default'},
  };
}

// Browser bar color, matching --surface in each theme.
export const viewport: Viewport = {
  themeColor: [
    {media: '(prefers-color-scheme: light)', color: '#f5f6f3'},
    {media: '(prefers-color-scheme: dark)', color: '#121713'},
  ],
};

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
