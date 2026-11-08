// No React here: used by client hooks (dates.ts) and by the server (link preview).

import type {DateTimeFormatOptions} from 'next-intl';

type DateTimeFormatter = {dateTime: (value: Date, options: DateTimeFormatOptions) => string};

/** Pure version of useFormatEventDate, for the server (getFormatter({locale})). */
export function formatEventDate(
  format: DateTimeFormatter,
  date: string | null,
  time?: string | null,
  style: 'short' | 'long' = 'short',
) {
  if (!date) return '';
  const hoursMinutes = time ? time.slice(0, 5) : '12:00';
  const value = new Date(`${date}T${hoursMinutes}:00Z`);
  const day = format.dateTime(value, {weekday: style, day: 'numeric', month: style, timeZone: 'UTC'});
  if (!time) return day;
  const hour = format.dateTime(value, {hour: 'numeric', minute: '2-digit', timeZone: 'UTC'});
  return `${day} · ${hour}`;
}
