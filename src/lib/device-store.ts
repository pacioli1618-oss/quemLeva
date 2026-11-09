// Everything QuemLeva keeps on the device, in one versioned place.
//
// Why a single module: the future improvements (docs/improvements.md) — moving to another
// phone, email recovery, sign-in sync — read and write exactly this. No component should
// touch localStorage directly.
//
// Browser only. Do not import from Server Components.

const STORAGE_KEY = 'quemleva';
const STORE_VERSION = 1;

export type StoredEvent = {
  slug: string;
  title: string;
  eventDate: string | null;
  role: 'host' | 'participant';
  /** Host only. This is the only copy: the server keeps just its hash. */
  hostToken?: string;
  participantId?: string;
  /** Last known suspension state, so "My events" can label the event and offer "Reactivate". */
  isSuspended?: boolean;
  lastOpenedAt: string;
};

export type DeviceStore = {
  version: typeof STORE_VERSION;
  /** Anonymous identity of this device, sent to the RPCs as p_device_id. */
  deviceId: string;
  /** Events by slug. */
  events: Record<string, StoredEvent>;
};

function createEmptyStore(): DeviceStore {
  return {version: STORE_VERSION, deviceId: crypto.randomUUID(), events: {}};
}

// When the format changes, bump STORE_VERSION and convert the previous version here.
function migrateStore(raw: unknown): DeviceStore | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<DeviceStore>;
  if (data.version === STORE_VERSION && typeof data.deviceId === 'string' && data.events) {
    return data as DeviceStore;
  }
  return null;
}

// localStorage may be missing or throw (private mode, WhatsApp's in-app browser):
// then the app keeps working in this tab's memory only.
let memoryStore: DeviceStore | null = null;

export function readStore(): DeviceStore {
  if (memoryStore) return memoryStore;
  try {
    const parsed = migrateStore(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null'));
    memoryStore = parsed ?? createEmptyStore();
    if (!parsed) writeStore(memoryStore);
  } catch {
    memoryStore = createEmptyStore();
  }
  return memoryStore;
}

function writeStore(store: DeviceStore) {
  memoryStore = store;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // No persistence available: keep going in memory.
  }
  listeners.forEach((listener) => listener());
}

// --- Change notifications (for React's useSyncExternalStore) ---

const listeners = new Set<() => void>();

/** Calls back when this tab or another tab changes the store. Returns the unsubscribe function. */
export function subscribeToStore(listener: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    memoryStore = null; // another tab wrote: read again
    listener();
  };
  listeners.add(listener);
  window.addEventListener('storage', handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', handleStorage);
  };
}

export function getDeviceId(): string {
  return readStore().deviceId;
}

/** The event as saved on this device, or undefined if this device never opened it. */
export function getStoredEvent(slug: string): StoredEvent | undefined {
  return readStore().events[slug];
}

/** Saves or updates an event in "My events". Never downgrades a host to participant. */
export function rememberEvent(event: Omit<StoredEvent, 'lastOpenedAt'>) {
  const store = readStore();
  const previous = store.events[event.slug];
  const next: StoredEvent = {
    ...previous,
    ...event,
    role: previous?.role === 'host' ? 'host' : event.role,
    hostToken: event.hostToken ?? previous?.hostToken,
    participantId: event.participantId ?? previous?.participantId,
    lastOpenedAt: new Date().toISOString(),
  };
  // New objects (not in-place edits) so React snapshots see the change.
  writeStore({...store, events: {...store.events, [event.slug]: next}});
}

/** Refreshes what "My events" shows (title, date, suspension) without touching role or tokens. */
export function updateStoredEvent(slug: string, patch: Partial<Pick<StoredEvent, 'title' | 'eventDate' | 'isSuspended'>>) {
  const store = readStore();
  const previous = store.events[slug];
  if (!previous) return;
  const changed = (Object.keys(patch) as (keyof typeof patch)[]).some((key) => previous[key] !== patch[key]);
  if (!changed) return;
  writeStore({...store, events: {...store.events, [slug]: {...previous, ...patch}}});
}

export function forgetEvent(slug: string) {
  const store = readStore();
  const events = {...store.events};
  delete events[slug];
  writeStore({...store, events});
}

/** "My events", most recent first. */
export function listMyEvents(): StoredEvent[] {
  return Object.values(readStore().events).sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
}

// --- Move to another phone (MVP: a link or QR code carrying the encoded store) ---

/** Serializes "My events" + deviceId as URL-safe text (for the #fragment, never the query string). */
export function exportStore(): string {
  const json = JSON.stringify(readStore());
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Merges events coming from another phone into this device.
 * On a new phone (no events yet) it adopts the source deviceId, so the person stays
 * "themselves" in the events they joined. If this device already has events of its own,
 * it keeps the current deviceId so it does not lose its identity there. Host tokens
 * come along in both cases.
 */
export function importStore(encoded: string): boolean {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const incoming = migrateStore(JSON.parse(new TextDecoder().decode(bytes)));
    if (!incoming) return false;
    const current = readStore();
    writeStore({
      version: STORE_VERSION,
      deviceId: Object.keys(current.events).length === 0 ? incoming.deviceId : current.deviceId,
      events: {...current.events, ...incoming.events},
    });
    return true;
  } catch {
    return false;
  }
}
