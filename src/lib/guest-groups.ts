import type {ParticipantView, Rsvp} from './api-mappers';

export type GuestGroupKey = Rsvp | 'pending';

/** Display order on the Guests screen: who is coming first, who said no last. */
export const guestGroupOrder: readonly GuestGroupKey[] = ['yes', 'maybe', 'pending', 'no'];

/** Groups participants by answer, keeping their order inside each group. Empty groups are left out. */
export function groupGuests<T extends Pick<ParticipantView, 'rsvp'>>(participants: T[]) {
  const groups = new Map<GuestGroupKey, T[]>(guestGroupOrder.map((key) => [key, []]));
  for (const participant of participants) groups.get(participant.rsvp ?? 'pending')!.push(participant);
  return guestGroupOrder
    .map((key) => ({key, participants: groups.get(key)!}))
    .filter((group) => group.participants.length > 0);
}
