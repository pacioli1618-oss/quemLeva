'use client';

import {useMemo, useState} from 'react';
import {useTranslations} from 'next-intl';
import {Logo} from '@/components/brand/Logo';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import {Button, ButtonLink} from '@/components/ui/Button';
import {Tag} from '@/components/ui/Tag';
import {useMyEvents} from '@/hooks/use-my-events';
import {useFormatEventDate} from '@/i18n/dates';
import {Link} from '@/i18n/navigation';
import {forgetEvent, type StoredEvent} from '@/lib/device-store';
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

function EventRow({event, isPast}: {event: StoredEvent; isPast?: boolean}) {
  const t = useTranslations('MyEvents');
  const common = useTranslations('Common');
  const formatEventDate = useFormatEventDate();
  const [isConfirming, setIsConfirming] = useState(false);
  const isHost = event.role === 'host';

  return (
    <li className={isPast ? `${styles.row} ${styles.isPast}` : styles.row}>
      <Link href={`/e/${event.slug}`} className={styles.rowLink}>
        <span className={styles.rowTitle}>{event.title}</span>
        <span className={styles.rowMeta}>
          {event.eventDate ? formatEventDate(event.eventDate) : t('noDate')}
        </span>
      </Link>
      <div className={styles.rowSide}>
        <Tag tone={isHost ? 'brand' : 'neutral'}>{isHost ? t('host') : t('participant')}</Tag>
        {!isConfirming && (
          <button type="button" className={styles.forget} onClick={() => setIsConfirming(true)}>
            {t('forget')}
          </button>
        )}
      </div>
      {isConfirming && (
        <div className={styles.confirm} role="group" aria-label={t('forget')}>
          <p className={styles.confirmText}>{t('forgetConfirm', {title: event.title})}</p>
          {isHost && <p className={styles.confirmWarning}>{t('forgetHostWarning')}</p>}
          <div className={styles.confirmActions}>
            <Button variant="secondary" onClick={() => setIsConfirming(false)}>
              {common('cancel')}
            </Button>
            <Button onClick={() => forgetEvent(event.slug)}>{t('forgetYes')}</Button>
          </div>
        </div>
      )}
    </li>
  );
}
