'use client';

import {useTranslations} from 'next-intl';
import {PrintSheet} from '@/components/print/PrintSheet';
import styles from '@/components/print/PrintTable.module.css';
import {useEvent} from '@/hooks/use-event';
import {useStoredEvent} from '@/hooks/use-stored-event';
import {useRpcErrorMessage} from '@/i18n/errors';
import {getEventSummary} from '@/lib/event-summary';
import {groupGuests} from '@/lib/guest-groups';

/** Rows left empty at the end, for people who show up without answering. */
const BLANK_ROWS = 6;

/** Screen 11 · Guest list on A4, grouped by answer, with a box to tick at the door. */
export function PrintGuestsScreen({slug}: {slug: string}) {
  const stored = useStoredEvent(slug);
  if (stored === null) return <PrintSheet slug={slug} event={null} title="" />;
  return <PrintGuests slug={slug} hostToken={stored?.hostToken} />;
}

function PrintGuests({slug, hostToken}: {slug: string; hostToken?: string}) {
  const t = useTranslations('Print');
  const guests = useTranslations('Guests');
  const common = useTranslations('Common');
  const {data, error} = useEvent(slug, hostToken);
  const rpcErrorMessage = useRpcErrorMessage();

  if (!data) {
    return (
      <PrintSheet
        slug={slug}
        event={null}
        title={t('guestsTitle')}
        status={error ? rpcErrorMessage(error as {message?: string}) : common('loading')}
      />
    );
  }

  const summary = getEventSummary(data);
  return (
    <PrintSheet
      slug={slug}
      event={data.event}
      title={t('guestsTitle')}
      subtitle={t('people', {confirmed: summary.peopleConfirmed, expected: summary.peopleExpected})}
    >
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.check} aria-label="✓" />
            <th>{t('name')}</th>
            <th>{t('presence')}</th>
            <th>{t('plusOnes')}</th>
          </tr>
        </thead>
        <tbody>
          {groupGuests(data.participants).map((group) => [
            <tr key={`group-${group.key}`} className={styles.groupRow}>
              <td colSpan={4}>
                {guests(`section.${group.key}`)} · {group.participants.length}
              </td>
            </tr>,
            ...group.participants.map((participant) => (
              <tr key={participant.id}>
                <td className={styles.check}>
                  <span className={styles.box} />
                </td>
                <td className={styles.name}>{participant.name}</td>
                <td>{guests(`status.${group.key}`)}</td>
                <td>{participant.plusOnes > 0 && participant.rsvp !== 'no' ? `+${participant.plusOnes}` : ''}</td>
              </tr>
            )),
          ])}
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
