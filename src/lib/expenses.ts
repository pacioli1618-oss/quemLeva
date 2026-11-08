import type {EventView} from './api-mappers';
import {getEventSummary} from './event-summary';

export type ParticipantExpense = {
  participantId: string;
  name: string;
  amount: number;
  /** Items this person reported spending on, in list order. */
  itemNames: string[];
};

export type ExpenseSummary = {
  total: number;
  /** Only people who reported something, biggest spender first. */
  byParticipant: ParticipantExpense[];
  /** Confirmed people, plus-ones included: the split the Spliit group will most likely use. */
  peopleConfirmed: number;
  /** total / peopleConfirmed, or null when nobody confirmed yet. */
  perPerson: number | null;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

/**
 * What each person spent, from the optional "amount spent" of their claims. QuemLeva only shows
 * the picture; settling up (who pays whom) happens in Spliit.
 */
export function getExpenseSummary(view: Pick<EventView, 'event' | 'items' | 'participants'>): ExpenseSummary {
  const byId = new Map<string, ParticipantExpense>();
  for (const item of view.items) {
    for (const claim of item.claims) {
      if (!claim.amountSpent) continue;
      const entry = byId.get(claim.participantId) ?? {participantId: claim.participantId, name: claim.name, amount: 0, itemNames: []};
      entry.amount = roundMoney(entry.amount + claim.amountSpent);
      entry.itemNames.push(item.name);
      byId.set(claim.participantId, entry);
    }
  }
  const byParticipant = [...byId.values()].sort((a, b) => b.amount - a.amount);
  const total = roundMoney(byParticipant.reduce((sum, entry) => sum + entry.amount, 0));
  const {peopleConfirmed} = getEventSummary(view);
  return {total, byParticipant, peopleConfirmed, perPerson: peopleConfirmed > 0 ? roundMoney(total / peopleConfirmed) : null};
}

/** The database only accepts https links; Spliit group links look like https://spliit.app/groups/<id>. */
export function normalizeSpliitUrl(input: string): string | null {
  const text = input.trim();
  try {
    const url = new URL(text);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
