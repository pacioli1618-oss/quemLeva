import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {getItemStatus, splitItemsByStatus} from '@/lib/item-status';

const claim = {participantId: 'p1', name: 'Ana', quantity: 1, note: null, amountSpent: null};

describe('getItemStatus', () => {
  it('counts what is still missing', () => {
    assert.deepEqual(getItemStatus({quantityNeeded: 9, quantityClaimed: 5, claims: [claim]}), {
      remaining: 4,
      isCovered: false,
      progress: 5 / 9,
    });
  });

  it('handles decimals without float noise', () => {
    assert.equal(getItemStatus({quantityNeeded: 3, quantityClaimed: 1.7, claims: [claim]}).remaining, 1.3);
  });

  it('is covered when the needed quantity is reached', () => {
    const status = getItemStatus({quantityNeeded: 2, quantityClaimed: 2, claims: [claim]});
    assert.equal(status.isCovered, true);
    assert.equal(status.progress, 1);
  });

  it('treats open items (no quantity) as covered once someone claims them', () => {
    assert.equal(getItemStatus({quantityNeeded: null, quantityClaimed: 0, claims: []}).isCovered, false);
    assert.deepEqual(getItemStatus({quantityNeeded: null, quantityClaimed: 1, claims: [claim]}), {
      remaining: null,
      isCovered: true,
      progress: 1,
    });
  });
});

describe('splitItemsByStatus', () => {
  it('keeps the host order inside each group', () => {
    const items = [
      {id: 'a', quantityNeeded: 2, quantityClaimed: 2, claims: [claim]},
      {id: 'b', quantityNeeded: 4, quantityClaimed: 0, claims: []},
      {id: 'c', quantityNeeded: null, quantityClaimed: 1, claims: [claim]},
      {id: 'd', quantityNeeded: null, quantityClaimed: 0, claims: []},
    ];
    const {missing, covered} = splitItemsByStatus(items);
    assert.deepEqual(missing.map((item) => item.id), ['b', 'd']);
    assert.deepEqual(covered.map((item) => item.id), ['a', 'c']);
  });
});
