// Response shapes and their conversion, kept apart from the network code so they can be
// tested against real RPC output (tests/fixtures/*.json). Keep in sync with the jsonb built
// in the latest migration; `npm test` fails when a field goes missing.

import type {Locale} from '@/i18n/locales';
import type {Json} from './database.types';

// ---------------------------------------------------------------------------
// View types (camelCase, what components use)
// ---------------------------------------------------------------------------

export type EventKind = 'barbecue' | 'lunch' | 'birthday' | 'christmas' | 'other';
export type Rsvp = 'yes' | 'no' | 'maybe';

export type EventDetails = {
  id: string;
  slug: string;
  title: string;
  eventDate: string | null;
  eventTime: string | null;
  location: string | null;
  adults: number;
  kids: number;
  notes: string | null;
  locale: Locale;
  currency: string;
  kind: EventKind;
  spliitGroupUrl: string | null;
  /** Set while the host has the event suspended: guests can look but not change anything. */
  suspendedAt: string | null;
  updatedAt: string;
};

export type ClaimView = {
  participantId: string;
  name: string;
  quantity: number;
  note: string | null;
  amountSpent: number | null;
};

export type ItemView = {
  id: string;
  name: string;
  unit: string | null;
  quantityNeeded: number | null;
  category: string | null;
  sort: number;
  quantityClaimed: number;
  claims: ClaimView[];
};

export type ParticipantView = {
  id: string;
  name: string;
  rsvp: Rsvp | null;
  plusOnes: number;
  invitedByHost: boolean;
};

export type HostParticipantView = ParticipantView & {
  inviteToken: string | null;
  isLinked: boolean;
  openedAt: string | null;
  rsvpAt: string | null;
  createdAt: string;
};

export type EventView = {
  event: EventDetails;
  /** This device's participant id, or null if it has not joined. */
  me: string | null;
  items: ItemView[];
  participants: ParticipantView[];
};

export type HostEventView = Omit<EventView, 'participants'> & {
  isHost: true;
  participants: HostParticipantView[];
};

// ---------------------------------------------------------------------------
// Raw response shapes (snake_case, exactly what the RPCs return)
// ---------------------------------------------------------------------------

export type RawEvent = {
  id: string;
  slug: string;
  title: string;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  adults: number;
  kids: number;
  notes: string | null;
  locale: Locale;
  currency: string;
  kind: EventKind;
  spliit_group_url: string | null;
  suspended_at: string | null;
  updated_at: string;
};
export type RawClaim = {participant_id: string; name: string; quantity: number; note: string | null; amount_spent: number | null};
export type RawItem = {
  id: string;
  name: string;
  unit: string | null;
  quantity_needed: number | null;
  category: string | null;
  sort: number;
  quantity_claimed: number;
  claims: RawClaim[];
};
export type RawParticipant = {id: string; name: string; rsvp: Rsvp | null; plus_ones: number; invited_by_host: boolean};
export type RawHostParticipant = RawParticipant & {
  invite_token: string | null;
  is_linked: boolean;
  opened_at: string | null;
  rsvp_at: string | null;
  created_at: string;
};
export type RawEventView = {event: RawEvent; me: string | null; items: RawItem[]; participants: RawParticipant[]};
export type RawHostEventView = Omit<RawEventView, 'participants'> & {is_host: true; participants: RawHostParticipant[]};

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

export function toEventDetails(raw: RawEvent): EventDetails {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    eventDate: raw.event_date,
    eventTime: raw.event_time,
    location: raw.location,
    adults: raw.adults,
    kids: raw.kids,
    notes: raw.notes,
    locale: raw.locale,
    currency: raw.currency,
    kind: raw.kind,
    spliitGroupUrl: raw.spliit_group_url,
    // Older responses (cached pages, fixtures) may not carry the field.
    suspendedAt: raw.suspended_at ?? null,
    updatedAt: raw.updated_at,
  };
}

function toItemView(raw: RawItem): ItemView {
  return {
    id: raw.id,
    name: raw.name,
    unit: raw.unit,
    quantityNeeded: raw.quantity_needed === null ? null : Number(raw.quantity_needed),
    category: raw.category,
    sort: raw.sort,
    quantityClaimed: Number(raw.quantity_claimed),
    claims: raw.claims.map((claim) => ({
      participantId: claim.participant_id,
      name: claim.name,
      quantity: Number(claim.quantity),
      note: claim.note,
      amountSpent: claim.amount_spent === null ? null : Number(claim.amount_spent),
    })),
  };
}

function toParticipantView(raw: RawParticipant): ParticipantView {
  return {id: raw.id, name: raw.name, rsvp: raw.rsvp, plusOnes: raw.plus_ones, invitedByHost: raw.invited_by_host};
}

export function toEventView(raw: RawEventView): EventView {
  return {
    event: toEventDetails(raw.event),
    me: raw.me,
    items: raw.items.map(toItemView),
    participants: raw.participants.map(toParticipantView),
  };
}

export function toHostEventView(raw: RawHostEventView): HostEventView {
  return {
    event: toEventDetails(raw.event),
    me: raw.me,
    isHost: true,
    items: raw.items.map(toItemView),
    participants: raw.participants.map((participant) => ({
      ...toParticipantView(participant),
      inviteToken: participant.invite_token,
      isLinked: participant.is_linked,
      openedAt: participant.opened_at,
      rsvpAt: participant.rsvp_at,
      createdAt: participant.created_at,
    })),
  };
}

/** Only the keys present change; null clears a field. */
export type EventPatch = Partial<{
  title: string;
  eventDate: string | null;
  eventTime: string | null;
  location: string | null;
  adults: number;
  kids: number;
  notes: string | null;
  locale: Locale;
  currency: string;
  kind: EventKind;
  spliitGroupUrl: string | null;
}>;

const eventPatchColumns: Record<keyof EventPatch, string> = {
  title: 'title',
  eventDate: 'event_date',
  eventTime: 'event_time',
  location: 'location',
  adults: 'adults',
  kids: 'kids',
  notes: 'notes',
  locale: 'locale',
  currency: 'currency',
  kind: 'kind',
  spliitGroupUrl: 'spliit_group_url',
};

export function toEventPatchJson(patch: EventPatch): Json {
  const json: Record<string, Json> = {};
  for (const [key, value] of Object.entries(patch) as [keyof EventPatch, Json | undefined][]) {
    if (value !== undefined) json[eventPatchColumns[key]] = value;
  }
  return json;
}
