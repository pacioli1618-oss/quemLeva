import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import {LegalPage} from '@/components/legal/LegalPage';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Terms');
  return {title: `${t('title')} · QuemLeva`, description: t('intro')};
}

// /terms · Short terms of use. Bump site.legalUpdatedAt when the text changes.
export default function TermsPage() {
  return (
    <LegalPage namespace="Terms" sections={['service', 'content', 'links', 'payments', 'license', 'law']} showUpdatedAt />
  );
}
