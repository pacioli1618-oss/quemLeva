'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/Button';
import {useStoredEvent} from '@/hooks/use-stored-event';
import {useRpcErrorMessage} from '@/i18n/errors';
import {setEventSuspended} from '@/lib/api';
import {updateStoredEvent} from '@/lib/device-store';
import styles from './SuspendedNotice.module.css';

type SuspendedNoticeProps = {
  slug: string;
  /** Reload the event after reactivating (Realtime also tells every open screen). */
  onReactivated?: () => void | Promise<void>;
};

/** Shown while the host has the event suspended. The host gets "Reactivate" right here. */
export function SuspendedNotice({slug, onReactivated}: SuspendedNoticeProps) {
  const t = useTranslations('Suspended');
  const rpcErrorMessage = useRpcErrorMessage();
  const hostToken = useStoredEvent(slug)?.hostToken;
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reactivate() {
    if (!hostToken) return;
    setIsBusy(true);
    setError(null);
    try {
      await setEventSuspended(slug, hostToken, false);
      updateStoredEvent(slug, {isSuspended: false});
      await onReactivated?.();
    } catch (failure) {
      setError(rpcErrorMessage(failure as {message?: string}));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className={styles.notice} role="status" aria-labelledby={`suspended-${slug}`}>
      <div className={styles.text}>
        <h2 id={`suspended-${slug}`} className={styles.title}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M10 9v6M14 9v6" />
          </svg>
          {t('title')}
        </h2>
        <p className={styles.body}>{hostToken ? t('hostBody') : t('guestBody')}</p>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>
      {hostToken && (
        <Button variant="secondary" onClick={reactivate} isLoading={isBusy}>
          {t('reactivate')}
        </Button>
      )}
    </section>
  );
}
