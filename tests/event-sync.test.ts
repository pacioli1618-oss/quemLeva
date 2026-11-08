import assert from 'node:assert/strict';
import {afterEach, beforeEach, describe, it, mock} from 'node:test';
import {createEventSync, REFRESH_DEBOUNCE_MS, type EventSyncHandlers} from '@/lib/event-sync';

// Lets pending promise callbacks run (load() resolutions) without advancing timers.
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

function setup(load: () => Promise<number>) {
  let handlers: EventSyncHandlers | null = null;
  const unsubscribe = mock.fn();
  const received: number[] = [];
  const errors: unknown[] = [];
  const sync = createEventSync<number>({
    load,
    subscribe: (h) => {
      handlers = h;
      return unsubscribe;
    },
    onData: (data) => received.push(data),
    onError: (error) => errors.push(error),
  });
  return {sync, received, errors, unsubscribe, handlers: () => handlers!};
}

describe('createEventSync', () => {
  beforeEach(() => mock.timers.enable({apis: ['setTimeout']}));
  afterEach(() => mock.timers.reset());

  it('loads as soon as it starts', async () => {
    let version = 0;
    const {received} = setup(async () => ++version);
    await flush();
    assert.deepEqual(received, [1]);
  });

  it('turns a burst of change notices into a single reload', async () => {
    let calls = 0;
    const {received, handlers} = setup(async () => ++calls);
    await flush();
    for (let i = 0; i < 5; i++) handlers().onChange();
    mock.timers.tick(REFRESH_DEBOUNCE_MS - 1);
    await flush();
    assert.equal(calls, 1, 'still waiting for the burst to end');
    mock.timers.tick(1);
    await flush();
    assert.equal(calls, 2);
    assert.deepEqual(received, [1, 2]);
  });

  it('ignores a slow older response that arrives after a newer one', async () => {
    const pending: Array<(value: number) => void> = [];
    const {sync, received} = setup(() => new Promise<number>((resolve) => pending.push(resolve)));
    void sync.refresh();
    pending[1]?.(2); // newer request answers first
    await flush();
    pending[0]?.(1); // the initial, older request answers late
    await flush();
    assert.deepEqual(received, [2]);
  });

  it('reloads right away after a reconnect', async () => {
    let calls = 0;
    const {handlers} = setup(async () => ++calls);
    await flush();
    handlers().onReconnect();
    await flush();
    assert.equal(calls, 2);
  });

  it('reports errors of the latest request', async () => {
    const {errors} = setup(async () => {
      throw new Error('not_joined');
    });
    await flush();
    assert.equal((errors[0] as Error).message, 'not_joined');
  });

  it('stops listening and drops late results after dispose', async () => {
    let resolveLoad: (value: number) => void = () => {};
    const {sync, received, unsubscribe, handlers} = setup(() => new Promise<number>((resolve) => (resolveLoad = resolve)));
    sync.dispose();
    resolveLoad(1);
    handlers().onChange();
    mock.timers.tick(REFRESH_DEBOUNCE_MS);
    await flush();
    assert.equal(unsubscribe.mock.callCount(), 1);
    assert.deepEqual(received, []);
  });
});
