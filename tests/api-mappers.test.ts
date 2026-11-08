import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
  toEventPatchJson,
  toEventView,
  toHostEventView,
  type RawEventView,
  type RawHostEventView,
} from '@/lib/api-mappers';
import getEventFixture from './fixtures/ql_get_event.json' with {type: 'json'};
import getEventAsHostFixture from './fixtures/ql_get_event_as_host.json' with {type: 'json'};

// Every key of a mapped object must be defined: undefined means the RPC stopped returning
// a field (or renamed it) and the view type no longer matches the database.
function assertNoUndefined(value: unknown, path = 'view') {
  if (value === undefined) assert.fail(`${path} is undefined`);
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) assertNoUndefined(child, `${path}.${key}`);
  }
}

describe('toEventView', () => {
  const view = toEventView(getEventFixture as RawEventView);

  it('maps every field from the real ql_get_event response', () => {
    assertNoUndefined(view);
  });

  it('converts snake_case to camelCase', () => {
    assert.equal(view.event.eventDate, '2026-11-29');
    assert.equal(view.event.eventTime, '13:00:00');
    assert.equal(view.event.spliitGroupUrl, null);
    assert.equal(view.participants[1]?.plusOnes, 2);
    assert.equal(view.participants[2]?.invitedByHost, true);
  });

  it('keeps quantities as numbers', () => {
    const meat = view.items[0];
    assert.equal(meat?.quantityNeeded, 3);
    assert.equal(meat?.quantityClaimed, 1.5);
    assert.equal(meat?.claims[0]?.quantity, 1.5);
    assert.equal(meat?.claims[0]?.amountSpent, 180.5);
    assert.equal(view.items[2]?.quantityNeeded, null);
  });

  it('never exposes device ids or invite tokens', () => {
    assert.doesNotMatch(JSON.stringify(view), /device_id|deviceId|invite_token|inviteToken/);
  });
});

describe('toHostEventView', () => {
  const view = toHostEventView(getEventAsHostFixture as RawHostEventView);

  it('maps every field from the real ql_get_event_as_host response', () => {
    assertNoUndefined(view);
  });

  it('adds invite and tracking data for the host', () => {
    assert.equal(view.isHost, true);
    const aunt = view.participants.find((participant) => participant.name === 'Tia Cris');
    assert.equal(aunt?.inviteToken, 'pgekpyamsp7tvbgt');
    assert.equal(aunt?.isLinked, false);
    assert.equal(view.participants[0]?.isLinked, true);
  });
});

describe('toEventPatchJson', () => {
  it('sends only the keys present, as column names', () => {
    assert.deepEqual(toEventPatchJson({title: 'Natal', spliitGroupUrl: null, eventDate: undefined}), {
      title: 'Natal',
      spliit_group_url: null,
    });
  });
});
