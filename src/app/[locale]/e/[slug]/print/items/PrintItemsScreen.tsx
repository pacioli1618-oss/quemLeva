'use client';

import {useTranslations} from 'next-intl';
import {useClaimSummary} from '@/components/event/use-claim-summary';
import {PrintSheet} from '@/components/print/PrintSheet';
import styles from '@/components/print/PrintTable.module.css';
import {useEvent} from '@/hooks/use-event';
import {useStoredEvent} from '@/hooks/use-stored-event';
import {useRpcErrorMessage} from '@/i18n/errors';
import {useCategoryLabel, useFormatAmount} from '@/i18n/units';
import {getEventSummary} from '@/lib/event-summary';
import {getItemStatus} from '@/lib/item-status';

/** Rows left empty at the end, to add items by hand on the day. */
const BLANK_ROWS = 4;

/** Screen 10 · Item list on A4: what, how much, who brings it, and a box to tick on the day. */
export function PrintItemsScreen({slug}: {slug: string}) {
  const stored = useStoredEvent(slug);
  if (stored === null) return <PrintSheet slug={slug} event={null} title="" />;
  return <PrintItems slug={slug} hostToken={stored?.hostToken} />;
}

function PrintItems({slug, hostToken}: {slug: string; hostToken?: string}) {
  const t = useTranslations('Print');
  const buildList = useTranslations('BuildList');
  const list = useTranslations('EventList');
  const common = useTranslations('Common');
  const {data, error} = useEvent(slug, hostToken);
  const rpcErrorMessage = useRpcErrorMessage();
  const formatAmount = useFormatAmount();
  const categoryLabel = useCategoryLabel();
  const summarizeClaims = useClaimSummary();

  if (!data) {
    return (
      <PrintSheet
        slug={slug}
        event={null}
        title={t('itemsTitle')}
        status={error ? rpcErrorMessage(error as {message?: string}) : common('loading')}
      />
    );
  }

  const summary = getEventSummary(data);
  return (
    <PrintSheet
      slug={slug}
      event={data.event}
      title={t('itemsTitle')}
      subtitle={`${list('summary', {done: summary.itemsCovered, total: summary.itemsTotal})} · ${common('people', {count: summary.peopleExpected})}`}
    >
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.check} aria-label="✓" />
            <th>{t('item')}</th>
            <th>{t('quantity')}</th>
            <th>{t('whoBrings')}</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item) => {
            const status = getItemStatus(item);
            // No "Você" on paper: everyone reading the sheet sees real names.
            const who = summarizeClaims(item, null);
            return (
              <tr key={item.id} className={status.isCovered ? styles.isDone : undefined}>
                <td className={styles.check}>
                  <span className={styles.box} />
                </td>
                <td>
                  <span className={styles.name}>{item.name}</span>
                  {item.category && <div className={styles.muted}>{categoryLabel(item.category)}</div>}
                </td>
                <td>{item.quantityNeeded === null ? buildList('anyAmount') : formatAmount(item.quantityNeeded, item.unit)}</td>
                <td>
                  {who || <span className={styles.muted}>—</span>}
                  {status.remaining !== null && status.remaining > 0 && item.claims.length > 0 && (
                    <div className={styles.missing}>{t('missing', {amount: formatAmount(status.remaining, item.unit)})}</div>
                  )}
                </td>
              </tr>
            );
          })}
          {Array.from({length: BLANK_ROWS}, (_, index) => (
            <tr key={`blank-${index}`} className={styles.blank}>
              <td className={styles.check}>
                <span className={styles.box} />
              </td>
              <td />
              <td />
              <td />
            </tr>
          ))}
        </tbody>
      </table>
    </PrintSheet>
  );
}
