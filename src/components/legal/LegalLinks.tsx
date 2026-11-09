import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
import styles from './LegalLinks.module.css';

/** "Sobre · Privacidade · Termos": small footer links on the home and join screens. */
export function LegalLinks({className}: {className?: string}) {
  const t = useTranslations('Legal');
  return (
    <nav className={[styles.links, className].filter(Boolean).join(' ')} aria-label={t('linksLabel')}>
      <Link href="/about">{t('about')}</Link>
      <span aria-hidden="true">·</span>
      <Link href="/privacy">{t('privacy')}</Link>
      <span aria-hidden="true">·</span>
      <Link href="/terms">{t('terms')}</Link>
    </nav>
  );
}
