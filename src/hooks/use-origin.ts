'use client';

import {useSyncExternalStore} from 'react';

const subscribe = () => () => {};

/** window.location.origin in the browser, '' during server rendering (no hydration mismatch). */
export function useOrigin() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => '',
  );
}
