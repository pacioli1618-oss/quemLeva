import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {toEventView, type RawEventView} from '@/lib/api-mappers';
import {getExpenseSummary, normalizeSpliitUrl} from '@/lib/expenses';
import fixture from './fixtures/ql_get_event.json' with {type: 'json'};

const view = toEventView(fixture as unknown as RawEventView);

describe('getExpenseSummary', () => {
  it('sums the amounts people reported and splits by confirmed people', () => {
    const summary = getExpenseSummary(view);
    assert.equal(summary.total, 180.5);
    assert.deepEqual(
      summary.byParticipant.map((entry) => [entry.name, entry.amount, entry.itemNames]),
      [['Ana', 180.5, ['Picanha']]],
    );
    assert.equal(summary.perPerson, Math.round((180.5 / summary.peopleConfirmed) * 100) / 100);
  });

  it('adds up several claims of one person and orders by amount', () => {
    const items = view.items.map((item) => ({...item, claims: [...item.claims]}));
    items[1].claims.push({participantId: 'p2', name: 'Paulo', quantity: 2, note: null, amountSpent: 30});
    items[2].claims.push({participantId: 'p2', name: 'Paulo', quantity: 1, note: null, amountSpent: 200.1});
    const summary = getExpenseSummary({...view, items});
    assert.deepEqual(
      summary.byParticipant.map((entry) => [entry.name, entry.amount]),
      [
        ['Paulo', 230.1],
        ['Ana', 180.5],
      ],
    );
    assert.equal(summary.total, 410.6);
  });

  it('has no per-person value without confirmed people', () => {
    const summary = getExpenseSummary({...view, participants: []});
    assert.equal(summary.perPerson, null);
  });
});

describe('normalizeSpliitUrl', () => {
  it('accepts https links and rejects anything else', () => {
    assert.equal(normalizeSpliitUrl(' https://spliit.app/groups/abc '), 'https://spliit.app/groups/abc');
    assert.equal(normalizeSpliitUrl('http://spliit.app/groups/abc'), null);
    assert.equal(normalizeSpliitUrl('spliit.app/groups/abc'), null);
    assert.equal(normalizeSpliitUrl(''), null);
  });
});
