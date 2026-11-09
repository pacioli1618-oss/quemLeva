import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import {LegalPage} from '@/components/legal/LegalPage';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('About');
  return {title: `${t('title')} · QuemLeva`, description: t('intro')};
}

// /about · Who makes QuemLeva, how to tell a real link from a scam, the source code.
export default function AboutPage() {
  return <LegalPage namespace="About" sections={['safety', 'who', 'code']} />;
}
