import {useTranslations} from 'next-intl';
import type {ItemView} from '@/lib/api-mappers';
import {useFormatAmount} from '@/i18n/units';

/**
 * "Tio Zé 3 kg · Paulo 2 kg", or "Juliana: pudim" for items without a unit. The current device's
 * claim reads "Você" so people find themselves at a glance.
 */
export function useClaimSummary() {
  const t = useTranslations('EventList');
  const common = useTranslations('Common');
  const formatAmount = useFormatAmount();

  return (item: ItemView, meId: string | null) =>
    item.claims
      .map((claim) => {
        const name = claim.participantId === meId ? common('you') : claim.name;
        // With a unit, the amount is the information ("Paulo 2 kg"). Without one, a note
        // says more than a bare number ("Juliana: pudim"); counts only when there is no note.
        if (item.unit !== null) return t('whoBrings', {name, amount: formatAmount(claim.quantity, item.unit)});
        if (claim.note) return t('whoBringsNote', {name, note: claim.note});
        if (item.quantityNeeded !== null) return t('whoBrings', {name, amount: formatAmount(claim.quantity)});
        return name;
      })
      .join(' · ');
}
