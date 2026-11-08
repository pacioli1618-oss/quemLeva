// The only door between the app and the database.
//
// - Calls the public.ql_* RPCs with typed arguments (database.types.ts, generated).
// - Converts snake_case responses into camelCase view types (api-mappers.ts, written by hand,
//   because the RPCs return jsonb and the generator can only type that as Json).
// - Throws RpcError with the fixed error code; translate it with useRpcErrorMessage().

import type {Locale} from '@/i18n/locales';
import {
  toEventPatchJson,
  toEventView,
  toHostEventView,
  type EventPatch,
  type EventKind,
  type EventView,
  type HostEventView,
  type RawEventView,
  type RawHostEventView,
  type Rsvp,
} from './api-mappers';
import type {Database} from './database.types';
import {supabase} from './supabase';

export type * from './api-mappers';

type Functions = Database['public']['Functions'];

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** message = the fixed error code (e.g. "not_joined"); details = DETAIL, when the RPC sets one. */
export class RpcError extends Error {
  constructor(
    message: string,
    public readonly details: string | null = null,
  ) {
    super(message);
    this.name = 'RpcError';
  }
}

async function call<F extends keyof Functions>(fn: F, args: Functions[F]['Args']): Promise<Functions[F]['Returns']> {
  const {data, error} = await supabase.rpc(fn, args as never);
  if (error) throw new RpcError(error.message, error.details || null);
  return data as Functions[F]['Returns'];
}

// ---------------------------------------------------------------------------
// Anyone with the link
// ---------------------------------------------------------------------------

export type CreateEventInput = {
  title: string;
  eventDate?: string;
  eventTime?: string;
  location?: string;
  adults?: number;
  kids?: number;
  notes?: string;
  deviceId?: string;
  hostName?: string;
  locale?: Locale;
  currency?: string;
  kind?: EventKind;
};

/** Returns the host token once. Store it with rememberEvent() right away: the server keeps only its hash. */
export async function createEvent(input: CreateEventInput) {
  const raw = (await call('ql_create_event', {
    p_title: input.title,
    p_event_date: input.eventDate,
    p_event_time: input.eventTime,
    p_location: input.location,
    p_adults: input.adults,
    p_kids: input.kids,
    p_notes: input.notes,
    p_device_id: input.deviceId,
    p_host_name: input.hostName,
    p_locale: input.locale,
    p_currency: input.currency,
    p_kind: input.kind,
  })) as {event_id: string; slug: string; host_token: string};
  return {eventId: raw.event_id, slug: raw.slug, hostToken: raw.host_token};
}

export async function getEvent(slug: string, deviceId?: string): Promise<EventView> {
  const raw = await call('ql_get_event', {p_slug: slug, p_device_id: deviceId});
  return toEventView(raw as unknown as RawEventView);
}

export async function openInvite(slug: string, inviteToken: string) {
  const raw = (await call('ql_open_invite', {p_slug: slug, p_invite_token: inviteToken})) as {
    participant_id: string;
    name: string;
    already_linked: boolean;
  };
  return {participantId: raw.participant_id, name: raw.name, isAlreadyLinked: raw.already_linked};
}

/** Returns this device's participant id. */
export async function joinEvent(input: {slug: string; deviceId: string; name: string; inviteToken?: string}) {
  return call('ql_join_event', {
    p_slug: input.slug,
    p_device_id: input.deviceId,
    p_name: input.name,
    p_invite_token: input.inviteToken,
  });
}

export async function setRsvp(input: {slug: string; deviceId: string; rsvp: Rsvp; plusOnes?: number}) {
  await call('ql_set_rsvp', {
    p_slug: input.slug,
    p_device_id: input.deviceId,
    p_rsvp: input.rsvp,
    p_plus_ones: input.plusOnes,
  });
}

/** quantity <= 0 withdraws the claim. Throws quantity_exceeds_remaining (details = what is left). */
export async function setClaim(input: {
  slug: string;
  deviceId: string;
  itemId: string;
  quantity: number;
  note?: string;
  amountSpent?: number;
}) {
  const raw = (await call('ql_set_claim', {
    p_slug: input.slug,
    p_device_id: input.deviceId,
    p_item_id: input.itemId,
    p_quantity: input.quantity,
    p_note: input.note,
    p_amount_spent: input.amountSpent,
  })) as {item_id: string; quantity_needed: number | null; quantity_claimed: number};
  return {
    itemId: raw.item_id,
    quantityNeeded: raw.quantity_needed === null ? null : Number(raw.quantity_needed),
    quantityClaimed: Number(raw.quantity_claimed),
  };
}

// ---------------------------------------------------------------------------
// Host only (hostToken)
// ---------------------------------------------------------------------------

/** deviceId fills "me": the host is a participant too. */
export async function getEventAsHost(slug: string, hostToken: string, deviceId?: string): Promise<HostEventView> {
  const raw = await call('ql_get_event_as_host', {p_slug: slug, p_host_token: hostToken, p_device_id: deviceId});
  return toHostEventView(raw as unknown as RawHostEventView);
}

export async function updateEvent(slug: string, hostToken: string, patch: EventPatch) {
  await call('ql_update_event', {p_slug: slug, p_host_token: hostToken, p_patch: toEventPatchJson(patch)});
}

export type ItemInput = {
  name: string;
  unit?: string;
  quantityNeeded?: number;
  category?: string;
};

/** Adds one item at the end of the list. Returns its id. */
export async function addItem(slug: string, hostToken: string, item: ItemInput & {sort?: number}) {
  return call('ql_upsert_item', {
    p_slug: slug,
    p_host_token: hostToken,
    // null means "insert". The generated type marks it required because p_name has no default.
    p_item_id: null as unknown as string,
    p_name: item.name,
    p_unit: item.unit,
    p_quantity_needed: item.quantityNeeded,
    p_category: item.category,
    p_sort: item.sort,
  });
}

/** Replaces every field of the item; omitted optional fields are cleared. */
export async function updateItem(slug: string, hostToken: string, itemId: string, item: ItemInput & {sort?: number}) {
  return call('ql_upsert_item', {
    p_slug: slug,
    p_host_token: hostToken,
    p_item_id: itemId,
    p_name: item.name,
    p_unit: item.unit,
    p_quantity_needed: item.quantityNeeded,
    p_category: item.category,
    p_sort: item.sort,
  });
}

/** Bulk insert (suggested list, repeat event). Returns how many were added. */
export async function addItems(slug: string, hostToken: string, items: ItemInput[]) {
  const json = items.map((item) => ({
    name: item.name,
    unit: item.unit ?? null,
    quantity_needed: item.quantityNeeded ?? null,
    category: item.category ?? null,
  }));
  return call('ql_add_items', {p_slug: slug, p_host_token: hostToken, p_items: json});
}

export async function deleteItem(slug: string, hostToken: string, itemId: string) {
  await call('ql_delete_item', {p_slug: slug, p_host_token: hostToken, p_item_id: itemId});
}

export async function inviteParticipant(slug: string, hostToken: string, name: string) {
  const raw = (await call('ql_invite_participant', {p_slug: slug, p_host_token: hostToken, p_name: name})) as {
    participant_id: string;
    invite_token: string;
  };
  return {participantId: raw.participant_id, inviteToken: raw.invite_token};
}

export async function removeParticipant(slug: string, hostToken: string, participantId: string) {
  await call('ql_remove_participant', {p_slug: slug, p_host_token: hostToken, p_participant_id: participantId});
}

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------

/**
 * Listens to the public broadcast channel event:<slug>. Database triggers send a "changed"
 * notice with no event data; the caller reloads with getEvent(). Returns the unsubscribe function.
 */
export function subscribeToEvent(slug: string, handlers: {onChange: () => void; onReconnect: () => void}) {
  let hasSubscribed = false;
  const channel = supabase
    .channel(`event:${slug}`)
    .on('broadcast', {event: 'changed'}, () => handlers.onChange())
    .subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;
      // SUBSCRIBED fires again after the socket reconnects (phone asleep, network switch).
      if (hasSubscribed) handlers.onReconnect();
      hasSubscribed = true;
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}
