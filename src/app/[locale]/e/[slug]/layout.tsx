import type {Metadata} from 'next';
import {getFormatter, getTranslations} from 'next-intl/server';
import {formatEventDate} from '@/i18n/format-event-date';
import {getEventPreview} from '@/lib/event-preview';

// Link preview for every page under /e/<slug>, including personal invites.
// Written in the event's language (events.locale), not the visitor's: the crawler that
// builds the preview sends no cookie, and the whole group should see the same card.
export async function generateMetadata({params}: LayoutProps<'/[locale]/e/[slug]'>): Promise<Metadata> {
  const {slug} = await params;
  const preview = await getEventPreview(slug);
  if (!preview) return {};

  const {locale} = preview;
  const t = await getTranslations({locale, namespace: 'Preview'});
  const format = await getFormatter({locale});
  const when = formatEventDate(format, preview.eventDate, preview.eventTime, 'long');
  const details = [when, preview.location].filter(Boolean).join(' · ');
  const description = details ? `${details}. ${t('cta')}.` : `${t('cta')}.`;
  const title = `${preview.title} · QuemLeva`;
  const image = {url: `/api/og/${slug}`, width: 1200, height: 630, alt: t('alt', {title: preview.title})};

  return {
    title,
    description,
    openGraph: {title: preview.title, description, siteName: 'QuemLeva', type: 'website', locale: locale.replace('-', '_'), images: [image]},
    twitter: {card: 'summary_large_image', title: preview.title, description, images: [image]},
    // Event links are private by nature: keep them out of search engines.
    robots: {index: false, follow: false},
  };
}

export default function EventLayout({children}: LayoutProps<'/[locale]/e/[slug]'>) {
  return children;
}
