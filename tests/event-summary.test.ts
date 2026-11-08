import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {toEventView, type RawEventView} from '@/lib/api-mappers';
import {getEventSummary} from '@/lib/event-summary';
import getEventFixture from './fixtures/ql_get_event.json' with {type: 'json'};

describe('getEventSummary', () => {
  it('summarizes the real ql_get_event fixture', () => {
    // Fixture: Picanha 1.5/3 kg (missing), Gelo 0/4 (missing), Farofa open with no claim (missing);
    // Luca yes +0, Ana yes +2, Tia Cris no answer; 20 adults + 5 kids planned.
    assert.deepEqual(getEventSummary(toEventView(getEventFixture as RawEventView)), {
      itemsTotal: 3,
      itemsCovered: 0,
      itemsMissing: 3,
      peopleConfirmed: 4,
      participantsMaybe: 0,
      peopleExpected: 25,
    });
  });
});
