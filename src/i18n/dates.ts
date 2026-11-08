import {useFormatter} from 'next-intl';

/**
 * The event's date and time are wall-clock values (events.event_date + event_time):
 * 13:00 on Sunday is 13:00 for everyone, wherever they are. So they are formatted in UTC,
 * with no time-zone conversion, only the language changes:
 * "seg., 9 de nov. · 13:00", "lun, 9 nov · 13:00", "Mon, Nov 9 · 1:00 PM".
 */
export function useFormatEventDate() {
  const format = useFormatter();

  /** style 'long' for the invite card: "domingo, 29 de novembro · 13:00". */
  return (date: string | null, time?: string | null, style: 'short' | 'long' = 'short') => {
    if (!date) return '';
    const hoursMinutes = time ? time.slice(0, 5) : '12:00';
    const value = new Date(`${date}T${hoursMinutes}:00Z`);
    const day = format.dateTime(value, {weekday: style, day: 'numeric', month: style, timeZone: 'UTC'});
    if (!time) return day;
    const hour = format.dateTime(value, {hour: 'numeric', minute: '2-digit', timeZone: 'UTC'});
    return `${day} · ${hour}`;
  };
}

/** Money in the currency stored on the event (events.currency). */
export function useFormatMoney() {
  const format = useFormatter();
  return (value: number, currency: string) => format.number(value, {style: 'currency', currency, currencyDisplay: 'narrowSymbol'});
}
