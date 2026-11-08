// Server only: what a link preview (WhatsApp, Telegram, iMessage) shows for /e/<slug>.
// Used by the event layout's metadata and by the image at /api/og/<slug>.

import {cacheLife} from 'next/cache';
import type {Locale} from '@/i18n/locales';
import {getEvent, RpcError, type EventKind} from './api';

export type EventPreview = {
  title: string;
  eventDate: string | null;
  eventTime: string | null;
  location: string | null;
  kind: EventKind;
  /** The organizer's language: the preview is the same for the whole group. */
  locale: Locale;
};

// Slugs are 12 random [a-z0-9] characters; anything else is not worth a database call.
const SLUG_PATTERN = /^[a-z0-9]{8,32}$/;

async function loadEventPreview(slug: string): Promise<EventPreview | null> {
  'use cache';
  // Previews are cached by the apps for days anyway; a few minutes here spares the database.
  cacheLife('minutes');
  try {
    const {event} = await getEvent(slug);
    return {
      title: event.title,
      eventDate: event.eventDate,
      eventTime: event.eventTime,
      location: event.location,
      kind: event.kind,
      locale: event.locale,
    };
  } catch (error) {
    if (error instanceof RpcError && error.message === 'event_not_found') return null;
    throw error; // not cached: the next request tries again
  }
}

/** null when the event does not exist or the database can't be reached: callers fall back to the app's preview. */
export async function getEventPreview(slug: string): Promise<EventPreview | null> {
  if (!SLUG_PATTERN.test(slug)) return null;
  try {
    return await loadEventPreview(slug);
  } catch {
    return null;
  }
}
