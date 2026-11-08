'use client';

import {useEffect, useState} from 'react';
import {useTranslations} from 'next-intl';
import {useRpcErrorMessage} from '@/i18n/errors';
import {useRouter} from '@/i18n/navigation';
import {getEventAsHost} from '@/lib/api';
import {getDeviceId, rememberEvent} from '@/lib/device-store';
import {readHostTokenFromHash} from '@/lib/share-links';

/**
 * Reads the host token from the #fragment, checks it against the database, saves it on this
 * device and opens the event. The token is never stored before the database accepts it.
 */
export function ManageScreen({slug}: {slug: string}) {
  const t = useTranslations('Manage');
  const rpcErrorMessage = useRpcErrorMessage();
  const router = useRouter();
  // The effect stores only what went wrong; translation happens while rendering, so the effect
  // depends on the slug alone and runs once.
  const [failure, setFailure] = useState<'missing-token' | {message?: string} | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const hostToken = readHostTokenFromHash(window.location.hash);

    async function openAsHost() {
      if (!hostToken) {
        setFailure('missing-token');
        return;
      }
      try {
        const view = await getEventAsHost(slug, hostToken, getDeviceId());
        if (isCancelled) return;
        rememberEvent({
          slug,
          title: view.event.title,
          eventDate: view.event.eventDate,
          role: 'host',
          hostToken,
          participantId: view.me ?? undefined,
        });
        // Drop the token from the address bar and history before moving on.
        window.history.replaceState(null, '', window.location.pathname);
        router.replace(`/e/${slug}`);
      } catch (rpcFailure) {
        if (!isCancelled) setFailure(rpcFailure as {message?: string});
      }
    }

    void openAsHost();
    return () => {
      isCancelled = true;
    };
  }, [slug, router]);

  const error = failure === null ? null : failure === 'missing-token' ? t('missingToken') : rpcErrorMessage(failure);

  return (
    <main style={{maxWidth: 480, margin: '0 auto', padding: 20, minHeight: '100dvh', display: 'grid', placeItems: 'center'}}>
      <p role={error ? 'alert' : 'status'} style={{margin: 0, fontSize: 15, lineHeight: '22px', color: error ? 'var(--ember-strong)' : 'var(--ink-muted)', textAlign: 'center'}}>
        {error ?? t('checking')}
      </p>
    </main>
  );
}
