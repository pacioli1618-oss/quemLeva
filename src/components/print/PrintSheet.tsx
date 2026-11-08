'use client';

import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {LogoSymbol} from '@/components/brand/Logo';
import {Button, ButtonLink} from '@/components/ui/Button';
import {useOrigin} from '@/hooks/use-origin';
import {useFormatEventDate} from '@/i18n/dates';
import type {EventDetails} from '@/lib/api';
import styles from './PrintSheet.module.css';

type PrintSheetProps = {
  slug: string;
  /** null while loading or on error; `status` is then shown instead of the sheet. */
  event: EventDetails | null;
  title: string;
  /** Second line under the date, e.g. "12 confirmados · 25 pessoas previstas". */
  subtitle?: string;
  status?: string;
  children?: ReactNode;
};

/** Shared A4 layout for the print versions: screen toolbar, event header, footer with the link. */
export function PrintSheet({slug, event, title, subtitle, status, children}: PrintSheetProps) {
  const t = useTranslations('Print');
  const formatEventDate = useFormatEventDate();
  const origin = useOrigin();
  const domain = origin ? new URL(origin).host : '';

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <ButtonLink href={`/e/${slug}`} variant="secondary">
          {t('back')}
        </ButtonLink>
        <Button onClick={() => window.print()} disabled={!event}>
          {t('print')}
        </Button>
      </div>

      {event ? (
        <article className={styles.sheet}>
          <header className={styles.header}>
            <div>
              <span className={styles.overline}>{title}</span>
              <h1 className={styles.title}>{event.title}</h1>
              <p className={styles.meta}>
                {[event.eventDate ? formatEventDate(event.eventDate, event.eventTime, 'long') : null, event.location]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {subtitle && <p className={styles.meta}>{subtitle}</p>}
            </div>
            <LogoSymbol size={36} />
          </header>
          {children}
          <footer className={styles.footer}>
            {t('generatedBy', {domain: domain ? `${domain}/e/${slug}` : ''})}
          </footer>
        </article>
      ) : (
        <p className={styles.status} role={status ? 'alert' : 'status'}>
          {status}
        </p>
      )}
    </div>
  );
}
