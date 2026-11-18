import {useTranslations} from 'next-intl';
import {appCommit, appVersion} from '@/lib/app-version';
import styles from './LegalLinks.module.css';

/** "versão 0.2.0 · a1b2c3d": which build is running, for support and bug reports. */
export function AppVersion({className}: {className?: string}) {
  const t = useTranslations('Legal');
  return (
    <p className={[styles.version, className].filter(Boolean).join(' ')}>
      {t('version', {version: appVersion})}
      {appCommit && ` · ${appCommit}`}
    </p>
  );
}
