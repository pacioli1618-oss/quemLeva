import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {groupGuests} from '@/lib/guest-groups';

describe('groupGuests', () => {
  it('orders yes, maybe, pending, no and drops empty groups', () => {
    const groups = groupGuests([
      {id: 'a', rsvp: 'no' as const},
      {id: 'b', rsvp: null},
      {id: 'c', rsvp: 'yes' as const},
      {id: 'd', rsvp: 'yes' as const},
    ]);
    assert.deepEqual(
      groups.map((group) => [group.key, group.participants.map((participant) => participant.id)]),
      [
        ['yes', ['c', 'd']],
        ['pending', ['b']],
        ['no', ['a']],
      ],
    );
  });

  it('returns nothing for an empty list', () => {
    assert.deepEqual(groupGuests([]), []);
  });
});
