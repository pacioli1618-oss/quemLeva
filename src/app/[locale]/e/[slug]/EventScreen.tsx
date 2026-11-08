'use client';

import {useEffect, useState} from 'react';
import {useTranslations} from 'next-intl';
import {EventList} from '@/components/event/EventList';
import {JoinForm} from '@/components/event/JoinForm';
import {Button, ButtonLink} from '@/components/ui/Button';
import {useEvent} from '@/hooks/use-event';
import {useStoredEvent} from '@/hooks/use-stored-event';
import {getRpcErrorCode, useRpcErrorMessage} from '@/i18n/errors';
import {useRouter} from '@/i18n/navigation';
import {openInvite} from '@/lib/api';
import {rememberEvent} from '@/lib/device-store';
import styles from './EventScreen.module.css';

type EventScreenProps = {
  slug: string;
  /** Present on /e/[slug]/invite/[inviteToken]. */
  inviteToken?: string;
};

/** /e/[slug]: the join form until this device has a name in the event, then the event list. */
export function EventScreen({slug, inviteToken}: EventScreenProps) {
  const stored = useStoredEvent(slug);
  // null = still reading this device's storage (always null on the server).
  if (stored === null) return <StatusMessage />;
  return <EventContent slug={slug} hostToken={stored?.hostToken} inviteToken={inviteToken} />;
}

function EventContent({slug, hostToken, inviteToken}: EventScreenProps & {hostToken?: string}) {
  const {data, error, isLoading, refresh} = useEvent(slug, hostToken);
  const invitedName = useInvitedName(slug, inviteToken);
  const router = useRouter();
  const isHost = Boolean(hostToken);
  const me = data?.me ?? null;

  // Keep "Meus eventos" fresh (title, date, last opened) whenever a joined device opens the event.
  useEffect(() => {
    if (!data || !me) return;
    rememberEvent({
      slug,
      title: data.event.title,
      eventDate: data.event.eventDate,
      role: isHost ? 'host' : 'participant',
      participantId: me,
    });
  }, [slug, data, me, isHost]);

  // Once joined, an invite link has done its job: show the plain event address.
  useEffect(() => {
    if (me && inviteToken) router.replace(`/e/${slug}`);
  }, [me, inviteToken, slug, router]);

  if (!data) {
    if (error) return <EventError error={error} onRetry={refresh} />;
    return <StatusMessage isBusy={isLoading} />;
  }

  if (!me) {
    // Wait for the invite lookup so the name does not pop in after the person starts typing.
    if (inviteToken && invitedName === undefined) return <StatusMessage />;
    return (
      <JoinForm
        slug={slug}
        view={data}
        isHost={isHost}
        inviteToken={inviteToken}
        initialName={invitedName ?? ''}
        onJoined={refresh}
      />
    );
  }

  return <EventList slug={slug} view={data} isHost={isHost} />;
}

/** undefined while loading; null when the invite is invalid (the plain join form still works). */
function useInvitedName(slug: string, inviteToken?: string) {
  const [name, setName] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!inviteToken) return;
    let isCancelled = false;
    openInvite(slug, inviteToken)
      .then((invite) => !isCancelled && setName(invite.name))
      .catch(() => !isCancelled && setName(null));
    return () => {
      isCancelled = true;
    };
  }, [slug, inviteToken]);
  return name;
}

function StatusMessage({isBusy = true}: {isBusy?: boolean}) {
  const common = useTranslations('Common');
  return (
    <main className={styles.status} aria-busy={isBusy}>
      <p role="status" className={styles.statusText}>
        {common('loading')}
      </p>
    </main>
  );
}

function EventError({error, onRetry}: {error: unknown; onRetry: () => Promise<void>}) {
  const common = useTranslations('Common');
  const notFound = useTranslations('NotFound');
  const rpcErrorMessage = useRpcErrorMessage();
  const isMissing = getRpcErrorCode(error as {message?: string}) === 'event_not_found';
  return (
    <main className={styles.status}>
      <p role="alert" className={styles.errorText}>
        {rpcErrorMessage(error as {message?: string})}
      </p>
      {isMissing ? (
        <ButtonLink href="/" variant="secondary">
          {notFound('cta')}
        </ButtonLink>
      ) : (
        <Button variant="secondary" onClick={() => void onRetry()}>
          {common('retry')}
        </Button>
      )}
    </main>
  );
}
