'use client';

import {useTranslations} from 'next-intl';
import type {ItemView} from '@/lib/api-mappers';
import {getItemStatus} from '@/lib/item-status';
import {useFormatAmount} from '@/i18n/units';
import {Link} from '@/i18n/navigation';
import {Button} from '@/components/ui/Button';
import {ProgressBar} from '@/components/ui/ProgressBar';
import {useClaimSummary} from './use-claim-summary';
import styles from './ItemCard.module.css';

type ItemCardProps = {
  item: ItemView;
  /** This device's participant id, to show "Você". */
  meId: string | null;
  onClaim: (item: ItemView) => void;
};

/** An item that still needs someone: what is missing, who brings what, and the "Eu levo" action. */
export function ItemCard({item, meId, onClaim}: ItemCardProps) {
  const t = useTranslations('EventList');
  const formatAmount = useFormatAmount();
  const summarizeClaims = useClaimSummary();
  const status = getItemStatus(item);
  const who = summarizeClaims(item, meId);

  return (
    <article className={styles.card} aria-labelledby={`item-${item.id}`}>
      <div className={styles.body}>
        <div className={styles.heading}>
          <h3 id={`item-${item.id}`} className={styles.name}>
            {item.name}
          </h3>
          {status.remaining !== null && (
            <span className={styles.left}>
              {t('left', {count: status.remaining, amount: formatAmount(status.remaining, item.unit)})}
            </span>
          )}
        </div>
        {item.quantityNeeded !== null && (
          <ProgressBar
            tone="ember"
            size="small"
            value={status.progress}
            label={t('itemProgress', {
              claimed: formatAmount(item.quantityClaimed, item.unit),
              needed: formatAmount(item.quantityNeeded, item.unit),
            })}
          />
        )}
        <span className={styles.who}>{who || t('nobodyYet')}</span>
      </div>
      <Button onClick={() => onClaim(item)}>{t('claim')}</Button>
    </article>
  );
}

type CoveredItemListProps = {
  items: ItemView[];
  meId: string | null;
  /** Where this device edits its own claim; rows of other people's items stay plain text. */
  getEditHref?: (item: ItemView) => string;
};

/** Items nobody needs to worry about anymore, as one compact list. */
export function CoveredItemList({items, meId, getEditHref}: CoveredItemListProps) {
  const t = useTranslations('Claim');
  const summarizeClaims = useClaimSummary();

  return (
    <ul className={styles.list}>
      {items.map((item) => {
        const isMine = item.claims.some((claim) => claim.participantId === meId);
        return (
          <li key={item.id} className={styles.row}>
            {isMine && getEditHref && (
              // Stretched over the whole row; the label names the item for screen readers.
              <Link href={getEditHref(item)} className={styles.rowLink} aria-label={t('editMine', {item: item.name})} />
            )}
            <svg className={styles.check} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className={styles.rowName}>{item.name}</span>
            <span className={isMine ? `${styles.rowWho} ${styles.isMine}` : styles.rowWho}>{summarizeClaims(item, meId)}</span>
          </li>
        );
      })}
    </ul>
  );
}
