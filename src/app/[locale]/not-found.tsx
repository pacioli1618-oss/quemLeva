import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('NotFound');

  return (
    <main style={{maxWidth: 480, margin: '0 auto', padding: 20, display: 'grid', gap: 12}}>
      <h1 style={{margin: 0, fontSize: 24, fontWeight: 800}}>{t('title')}</h1>
      <p style={{margin: 0, color: 'var(--ink-muted)'}}>{t('body')}</p>
      <Link href="/" style={{color: 'var(--brand)', fontWeight: 700}}>
        {t('cta')}
      </Link>
    </main>
  );
}
