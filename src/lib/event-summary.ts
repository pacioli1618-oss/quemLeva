import type {EventView} from './api-mappers';
import {getItemStatus} from './item-status';

export type EventSummary = {
  itemsTotal: number;
  itemsCovered: number;
  itemsMissing: number;
  /** Participants who answered "yes" plus the people they bring. */
  peopleConfirmed: number;
  participantsMaybe: number;
  /** The host's planned headcount (adults + kids). */
  peopleExpected: number;
};

/** The numbers behind the event's summary card and the join screen's tags. */
export function getEventSummary(view: Pick<EventView, 'event' | 'items' | 'participants'>): EventSummary {
  const itemsCovered = view.items.filter((item) => getItemStatus(item).isCovered).length;
  const going = view.participants.filter((participant) => participant.rsvp === 'yes');
  return {
    itemsTotal: view.items.length,
    itemsCovered,
    itemsMissing: view.items.length - itemsCovered,
    peopleConfirmed: going.reduce((total, participant) => total + 1 + participant.plusOnes, 0),
    participantsMaybe: view.participants.filter((participant) => participant.rsvp === 'maybe').length,
    peopleExpected: view.event.adults + view.event.kids,
  };
}
