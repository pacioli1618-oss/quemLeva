'use client';

import {useTranslations} from 'next-intl';
import {CoveredItemList, ItemCard} from '@/components/event/ItemCard';
import {TabBar} from '@/components/event/TabBar';
import {ButtonLink, buttonClassName} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {ProgressBar} from '@/components/ui/ProgressBar';
import {Tag} from '@/components/ui/Tag';
import {useFormatEventDate} from '@/i18n/dates';
import {useRouter} from '@/i18n/navigation';
import type {EventView, ItemView} from '@/lib/api';
import {getEventSummary} from '@/lib/event-summary';
import {splitItemsByStatus} from '@/lib/item-status';
import {SuspendedNotice} from './SuspendedNotice';
import styles from './EventList.module.css';

type EventListProps = {
  slug: string;
  view: Pick<EventView, 'event' | 'items' | 'participants' | 'me'>;
  isHost: boolean;
  /** Reload after an action on this screen (reactivating a suspended event). */
  onChanged?: () => void | Promise<void>;
};

/** Screen 5 · The event: what is still missing, what is covered, and "Eu levo". */
export function EventList({slug, view, isHost, onChanged}: EventListProps) {
  const t = useTranslations('EventList');
  const common = useTranslations('Common');
  const formatEventDate = useFormatEventDate();
  const router = useRouter();
  const summary = getEventSummary(view);
  const {missing, covered} = splitItemsByStatus(view.items);
  const {event} = view;

  const meta = [event.eventDate ? formatEventDate(event.eventDate, event.eventTime) : null, event.location]
    .filter(Boolean)
    .join(' · ');

  function openClaim(item: ItemView) {
    router.push(`/e/${slug}/claim/${item.id}`);
  }

  return (
    <div className={styles.screen}>
      <main className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>{event.title}</h1>
          {meta && <p className={styles.meta}>{meta}</p>}
        </header>

        {event.suspendedAt && <SuspendedNotice slug={slug} onReactivated={onChanged} />}

        {summary.itemsTotal > 0 && (
          <Card className={styles.summary}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryTitle}>
                {t('summary', {done: summary.itemsCovered, total: summary.itemsTotal})}
              </span>
              {summary.peopleExpected > 0 && (
                <span className={styles.summaryAside}>{t('peopleExpected', {count: summary.peopleExpected})}</span>
              )}
            </div>
            <ProgressBar
              value={summary.itemsCovered / summary.itemsTotal}
              label={t('summary', {done: summary.itemsCovered, total: summary.itemsTotal})}
            />
            <div className={styles.tags}>
              <Tag tone="brand">{t('confirmed', {count: summary.peopleConfirmed})}</Tag>
              {summary.participantsMaybe > 0 && <Tag>{t('maybe', {count: summary.participantsMaybe})}</Tag>}
              {summary.itemsMissing > 0 && <Tag tone="ember">{t('missingItems', {count: summary.itemsMissing})}</Tag>}
            </div>
          </Card>
        )}

        {summary.itemsTotal === 0 && <p className={styles.notice}>{t('emptyList')}</p>}

        {missing.length > 0 && (
          <section className={styles.section} aria-labelledby="missing-title">
            <h2 id="missing-title" className={styles.sectionTitle}>
              {t('sectionMissing')}
            </h2>
            <ul className={styles.itemList}>
              {missing.map((item) => (
                <li key={item.id}>
                  <ItemCard item={item} meId={view.me} onClaim={openClaim} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {summary.itemsTotal > 0 && missing.length === 0 && <p className={styles.notice}>{t('allCovered')}</p>}

        {covered.length > 0 && (
          <section className={styles.section} aria-labelledby="covered-title">
            <h2 id="covered-title" className={styles.sectionTitle}>
              {t('sectionDone')}
            </h2>
            <CoveredItemList items={covered} meId={view.me} getEditHref={(item) => `/e/${slug}/claim/${item.id}`} />
          </section>
        )}

        {event.spliitGroupUrl && (
          <a className={buttonClassName({variant: 'secondary', isFullWidth: true})} href={event.spliitGroupUrl} target="_blank" rel="noopener noreferrer">
            {t('settleUp')}
          </a>
        )}

        <div className={styles.footerLinks}>
          {isHost && (
            <ButtonLink href={`/e/${slug}/items`} variant="secondary">
              {t('editList')}
            </ButtonLink>
          )}
          {summary.itemsTotal > 0 && (
            <ButtonLink href={`/e/${slug}/print/items`} variant="ghost">
              {common('print')}
            </ButtonLink>
          )}
        </div>
      </main>
      <TabBar slug={slug} isHost={isHost} />
    </div>
  );
}
