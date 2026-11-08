'use client';

import {useSyncExternalStore} from 'react';
import {readStore, subscribeToStore, type StoredEvent} from '@/lib/device-store';

/**
 * Every event this device knows, kept in sync with the device store. `null` on the server and
 * before hydration. The snapshot is the store's events object, which only changes on writes
 * (sorting is left to the caller so each render does not create a new snapshot).
 */
export function useMyEvents(): Record<string, StoredEvent> | null {
  return useSyncExternalStore(
    subscribeToStore,
    () => readStore().events,
    () => null,
  );
}
