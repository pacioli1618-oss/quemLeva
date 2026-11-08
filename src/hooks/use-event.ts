'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {getEvent, getEventAsHost, subscribeToEvent, type EventView, type HostEventView} from '@/lib/api';
import {getDeviceId} from '@/lib/device-store';
import {createEventSync, type EventSync} from '@/lib/event-sync';

type EventState<T> = {
  /** Which slug/token this state belongs to, so a new slug never shows the old event. */
  key: string;
  data: T | null;
  error: unknown;
};

export type UseEventResult<T> = {
  data: T | null;
  error: unknown;
  isLoading: boolean;
  /** Reload now, e.g. right after this device saves a claim. */
  refresh: () => Promise<void>;
};

/**
 * Loads an event and keeps it live: reloads when anyone changes it (Realtime broadcast),
 * after a reconnect, and when the page becomes visible again (phones drop sockets in the background).
 * With hostToken it loads the host view (invites, tracking); "me" is filled in both cases.
 */
export function useEvent(slug: string): UseEventResult<EventView>;
export function useEvent(slug: string, hostToken: string): UseEventResult<HostEventView>;
/** Host view if this device holds a token, participant view otherwise. */
export function useEvent(slug: string, hostToken: string | undefined): UseEventResult<EventView | HostEventView>;
export function useEvent(slug: string, hostToken?: string): UseEventResult<EventView | HostEventView> {
  const key = `${slug}:${hostToken ?? ''}`;
  const [state, setState] = useState<EventState<EventView | HostEventView>>({key, data: null, error: null});
  const syncRef = useRef<EventSync | null>(null);

  useEffect(() => {
    const deviceId = getDeviceId();
    const sync = createEventSync<EventView | HostEventView>({
      load: () => (hostToken ? getEventAsHost(slug, hostToken, deviceId) : getEvent(slug, deviceId)),
      subscribe: (handlers) => subscribeToEvent(slug, handlers),
      onData: (data) => setState({key, data, error: null}),
      onError: (error) => setState((previous) => ({key, data: previous.key === key ? previous.data : null, error})),
    });
    syncRef.current = sync;

    const handleVisible = () => {
      if (document.visibilityState === 'visible') void sync.refresh();
    };
    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('online', handleVisible);

    return () => {
      sync.dispose();
      syncRef.current = null;
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('online', handleVisible);
    };
  }, [key, slug, hostToken]);

  const refresh = useCallback(async () => {
    await syncRef.current?.refresh();
  }, []);

  const isCurrent = state.key === key;
  return {
    data: isCurrent ? state.data : null,
    error: isCurrent ? state.error : null,
    isLoading: !isCurrent || (state.data === null && state.error === null),
    refresh,
  };
}
