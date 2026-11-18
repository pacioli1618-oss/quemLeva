import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
import {InstallButton} from '@/components/InstallButton';
import {appCommit, appVersion} from '@/lib/app-version';
import styles from './LegalLinks.module.css';

/** "Fixar na tela do celular" + "Sobre · Privacidade · Termos" + app version: the footer of the main screens. */
export function LegalLinks({className}: {className?: string}) {
  const t = useTranslations('Legal');
  return (
    <>
      <InstallButton />
      <nav className={[styles.links, className].filter(Boolean).join(' ')} aria-label={t('linksLabel')}>
        <Link href="/about">{t('about')}</Link>
        <span aria-hidden="true">·</span>
        <Link href="/privacy">{t('privacy')}</Link>
        <span aria-hidden="true">·</span>
        <Link href="/terms">{t('terms')}</Link>
      </nav>
      <p className={styles.version}>
        {t('version', {version: appVersion})}
        {appCommit && ` · ${appCommit}`}
      </p>
    </>
  );
}
