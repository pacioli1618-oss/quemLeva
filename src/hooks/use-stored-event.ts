'use client';

import {useSyncExternalStore} from 'react';
import {getStoredEvent, subscribeToStore, type StoredEvent} from '@/lib/device-store';

/**
 * What this device knows about an event (role, host token), kept in sync with the device store.
 * Returns `null` while rendering on the server or before hydration, `undefined` when this
 * device never opened the event. Wait for `null` to pass before deciding someone is not the host.
 */
export function useStoredEvent(slug: string): StoredEvent | undefined | null {
  return useSyncExternalStore(
    subscribeToStore,
    () => getStoredEvent(slug),
    () => null,
  );
}
