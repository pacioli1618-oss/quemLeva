'use client';

import {useMemo, useState} from 'react';
import {useTranslations} from 'next-intl';
import {Logo} from '@/components/brand/Logo';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import {Button, ButtonLink} from '@/components/ui/Button';
import {ActionMenu, type ActionMenuItem} from '@/components/ui/ActionMenu';
import {Tag} from '@/components/ui/Tag';
import {useMyEvents} from '@/hooks/use-my-events';
import {useFormatEventDate} from '@/i18n/dates';
import {useRpcErrorMessage} from '@/i18n/errors';
import {Link, useRouter} from '@/i18n/navigation';
import {deleteEvent, setEventSuspended} from '@/lib/api';
import {forgetEvent, updateStoredEvent, type StoredEvent} from '@/lib/device-store';
import {groupMyEvents, toLocalDateString} from '@/lib/my-events';
import styles from './MyEvents.module.css';

/** Screen 8 · My events: what this phone created or joined, upcoming first. */
export function MyEventsScreen() {
  const t = useTranslations('MyEvents');
  const events = useMyEvents();
  const groups = useMemo(
    () => (events ? groupMyEvents(Object.values(events), toLocalDateString(new Date())) : null),
    [events],
  );

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <Logo />
        <LocaleSwitcher />
      </header>

      <div className={styles.titleRow}>
        <h1 className={styles.title}>{t('title')}</h1>
        <ButtonLink href="/" variant="secondary">
          {t('create')}
        </ButtonLink>
      </div>

      {/* null until the browser storage is read: render nothing rather than a false "empty". */}
      {groups && groups.upcoming.length === 0 && groups.past.length === 0 && (
        <p className={styles.notice}>{t('empty')}</p>
      )}

      {groups && groups.upcoming.length > 0 && <EventGroup id="upcoming" title={t('upcoming')} events={groups.upcoming} />}
      {groups && groups.past.length > 0 && <EventGroup id="past" title={t('past')} events={groups.past} isPast />}
    </main>
  );
}

function EventGroup({id, title, events, isPast}: {id: string; title: string; events: StoredEvent[]; isPast?: boolean}) {
  return (
    <section className={styles.section} aria-labelledby={`group-${id}`}>
      <h2 id={`group-${id}`} className={styles.sectionTitle}>
        {title}
      </h2>
      <ul className={styles.list}>
        {events.map((event) => (
          <EventRow key={event.slug} event={event} isPast={isPast} />
        ))}
      </ul>
    </section>
  );
}

type PendingAction = 'suspend' | 'delete' | 'forget' | null;

function EventRow({event, isPast}: {event: StoredEvent; isPast?: boolean}) {
  const t = useTranslations('MyEvents');
  const common = useTranslations('Common');
  const formatEventDate = useFormatEventDate();
  const rpcErrorMessage = useRpcErrorMessage();
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hostToken = event.role === 'host' ? event.hostToken : undefined;
  const isHost = Boolean(hostToken);

  async function run(action: () => Promise<void>) {
    setIsBusy(true);
    setError(null);
    try {
      await action();
      setPending(null);
    } catch (failure) {
      setError(rpcErrorMessage(failure as {message?: string}));
    } finally {
      setIsBusy(false);
    }
  }

  function choose(action: PendingAction) {
    setError(null);
    setPending(action);
  }

  const items: ActionMenuItem[] = hostToken
    ? [
        {key: 'edit', label: t('edit'), onSelect: () => router.push(`/e/${event.slug}/edit`)},
        event.isSuspended
          ? {
              key: 'reactivate',
              label: t('reactivate'),
              onSelect: () =>
                run(async () => {
                  await setEventSuspended(event.slug, hostToken, false);
                  updateStoredEvent(event.slug, {isSuspended: false});
                }),
            }
          : {key: 'suspend', label: t('suspend'), onSelect: () => choose('suspend')},
        {key: 'forget', label: t('forget'), onSelect: () => choose('forget')},
        {key: 'delete', label: t('delete'), onSelect: () => choose('delete'), isDanger: true},
      ]
    : [{key: 'forget', label: t('forget'), onSelect: () => choose('forget')}];

  return (
    <li className={isPast ? `${styles.row} ${styles.isPast}` : styles.row}>
      <Link href={`/e/${event.slug}`} className={styles.rowLink}>
        <span className={styles.rowTitle}>{event.title}</span>
        <span className={styles.rowMeta}>
          {event.eventDate ? formatEventDate(event.eventDate) : t('noDate')}
        </span>
      </Link>
      <div className={styles.rowSide}>
        <ActionMenu label={t('moreActions', {title: event.title})} items={items} />
        <div className={styles.tags}>
          {event.isSuspended && <Tag tone="ember">{t('suspended')}</Tag>}
          <Tag tone={isHost ? 'brand' : 'neutral'}>{isHost ? t('host') : t('participant')}</Tag>
        </div>
      </div>

      {pending === 'suspend' && hostToken && (
        <Confirm
          title={t('suspendConfirm', {title: event.title})}
          note={t('suspendHint')}
          confirmLabel={t('suspendYes')}
          error={error}
          isBusy={isBusy}
          onCancel={() => choose(null)}
          onConfirm={() =>
            run(async () => {
              await setEventSuspended(event.slug, hostToken, true);
              updateStoredEvent(event.slug, {isSuspended: true});
            })
          }
        />
      )}
      {pending === 'delete' && hostToken && (
        <Confirm
          title={t('deleteConfirm', {title: event.title})}
          warning={t('deleteWarning')}
          confirmLabel={t('deleteYes')}
          error={error}
          isBusy={isBusy}
          onCancel={() => choose(null)}
          onConfirm={() =>
            run(async () => {
              await deleteEvent(event.slug, hostToken);
              forgetEvent(event.slug);
            })
          }
        />
      )}
      {pending === 'forget' && (
        <Confirm
          title={t('forgetConfirm', {title: event.title})}
          warning={isHost ? t('forgetHostWarning') : undefined}
          confirmLabel={t('forgetYes')}
          cancelLabel={common('cancel')}
          onCancel={() => choose(null)}
          onConfirm={() => forgetEvent(event.slug)}
        />
      )}
      {!pending && error && (
        <p className={styles.rowError} role="alert">
          {error}
        </p>
      )}
    </li>
  );
}

type ConfirmProps = {
  title: string;
  note?: string;
  warning?: string;
  confirmLabel: string;
  cancelLabel?: string;
  error?: string | null;
  isBusy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function Confirm({title, note, warning, confirmLabel, cancelLabel, error, isBusy, onCancel, onConfirm}: ConfirmProps) {
  const common = useTranslations('Common');
  return (
    <div className={styles.confirm} role="group" aria-label={title}>
      <p className={styles.confirmText}>{title}</p>
      {note && <p className={styles.confirmNote}>{note}</p>}
      {warning && <p className={styles.confirmWarning}>{warning}</p>}
      {error && (
        <p className={styles.confirmWarning} role="alert">
          {error}
        </p>
      )}
      <div className={styles.confirmActions}>
        <Button variant="secondary" onClick={onCancel} disabled={isBusy}>
          {cancelLabel ?? common('cancel')}
        </Button>
        <Button onClick={onConfirm} isLoading={isBusy}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
