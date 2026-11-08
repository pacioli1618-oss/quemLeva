import type {StoredEvent} from './device-store';

export type MyEventGroups<T extends Pick<StoredEvent, 'eventDate' | 'lastOpenedAt'>> = {
  /** Today or later, soonest first; events without a date go last, most recently opened first. */
  upcoming: T[];
  /** Before today, most recent first. */
  past: T[];
};

/**
 * Splits "My events" around today. `today` is the device's local date as YYYY-MM-DD; event
 * dates are stored the same way, so plain string comparison is enough.
 */
export function groupMyEvents<T extends Pick<StoredEvent, 'eventDate' | 'lastOpenedAt'>>(events: T[], today: string): MyEventGroups<T> {
  const dated = events.filter((event) => event.eventDate !== null);
  const undated = events
    .filter((event) => event.eventDate === null)
    .sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
  return {
    upcoming: [
      ...dated.filter((event) => event.eventDate! >= today).sort((a, b) => a.eventDate!.localeCompare(b.eventDate!)),
      ...undated,
    ],
    past: dated.filter((event) => event.eventDate! < today).sort((a, b) => b.eventDate!.localeCompare(a.eventDate!)),
  };
}

/** The device's local date as YYYY-MM-DD (not UTC: an event "today" in São Paulo stays today at 22h). */
export function toLocalDateString(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
