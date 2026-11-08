import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {groupMyEvents, toLocalDateString} from '@/lib/my-events';

const event = (slug: string, eventDate: string | null, lastOpenedAt = '2026-11-01T00:00:00Z') => ({slug, eventDate, lastOpenedAt});

describe('groupMyEvents', () => {
  it('puts today and later first, soonest first, then undated by last opened', () => {
    const groups = groupMyEvents(
      [
        event('dec', '2026-12-24'),
        event('undated-old', null, '2026-10-01T00:00:00Z'),
        event('today', '2026-11-08'),
        event('undated-new', null, '2026-11-07T00:00:00Z'),
        event('nov', '2026-11-29'),
      ],
      '2026-11-08',
    );
    assert.deepEqual(
      groups.upcoming.map((item) => item.slug),
      ['today', 'nov', 'dec', 'undated-new', 'undated-old'],
    );
    assert.deepEqual(groups.past, []);
  });

  it('lists past events most recent first', () => {
    const groups = groupMyEvents([event('oct', '2026-10-12'), event('nov', '2026-11-07')], '2026-11-08');
    assert.deepEqual(
      groups.past.map((item) => item.slug),
      ['nov', 'oct'],
    );
  });
});

describe('toLocalDateString', () => {
  it('formats the local calendar date with zero padding', () => {
    assert.equal(toLocalDateString(new Date(2026, 0, 5, 23, 30)), '2026-01-05');
  });
});
