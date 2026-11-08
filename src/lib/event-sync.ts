// Keeps one event's data fresh: loads it, reloads when the database announces a change,
// and never lets an older response overwrite a newer one. Framework-free so it can be
// unit-tested; React binds it in src/hooks/use-event.ts.

export const REFRESH_DEBOUNCE_MS = 300;

export type EventSyncHandlers = {
  /** A row of this event changed. Several in a row (bulk insert) arrive within milliseconds. */
  onChange: () => void;
  /** The realtime connection came back after a drop: changes may have been missed. */
  onReconnect: () => void;
};

export type EventSyncOptions<T> = {
  load: () => Promise<T>;
  /** Starts listening and returns the function that stops it. */
  subscribe: (handlers: EventSyncHandlers) => () => void;
  onData: (data: T) => void;
  onError: (error: unknown) => void;
  debounceMs?: number;
};

export type EventSync = {
  /** Loads now. Use after this device writes something, and when the page becomes visible again. */
  refresh: () => Promise<void>;
  /** Loads once the burst of change notices is over. */
  scheduleRefresh: () => void;
  dispose: () => void;
};

export function createEventSync<T>(options: EventSyncOptions<T>): EventSync {
  const debounceMs = options.debounceMs ?? REFRESH_DEBOUNCE_MS;
  let latestRequest = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let isDisposed = false;

  async function refresh() {
    if (isDisposed) return;
    const request = ++latestRequest;
    try {
      const data = await options.load();
      if (!isDisposed && request === latestRequest) options.onData(data);
    } catch (error) {
      if (!isDisposed && request === latestRequest) options.onError(error);
    }
  }

  function scheduleRefresh() {
    if (isDisposed) return;
    clearTimeout(timer);
    timer = setTimeout(() => void refresh(), debounceMs);
  }

  const unsubscribe = options.subscribe({onChange: scheduleRefresh, onReconnect: () => void refresh()});
  void refresh();

  return {
    refresh,
    scheduleRefresh,
    dispose() {
      isDisposed = true;
      clearTimeout(timer);
      unsubscribe();
    },
  };
}
