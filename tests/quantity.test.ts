import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {getInitialClaimQuantity, getQuantityStep, parseQuantity} from '@/lib/quantity';

describe('parseQuantity', () => {
  it('reads integers and decimals with comma or dot', () => {
    assert.equal(parseQuantity('2'), 2);
    assert.equal(parseQuantity('1,5'), 1.5);
    assert.equal(parseQuantity('1.5'), 1.5);
    assert.equal(parseQuantity(' 12 '), 12);
  });

  it('treats empty input as "no exact amount"', () => {
    assert.equal(parseQuantity(''), undefined);
    assert.equal(parseQuantity('   '), undefined);
  });

  it('rejects anything that is not a positive number', () => {
    for (const input of ['0', '-1', 'abc', '1,2,3', '2 kg', '1.000,50', '1e3']) {
      assert.equal(parseQuantity(input), null, input);
    }
  });

  it('rounds to the database precision', () => {
    assert.equal(parseQuantity('1,239'), 1.24);
  });
});

describe('getQuantityStep', () => {
  it('uses half steps for kg and l, 100 for g and ml, 1 otherwise', () => {
    assert.equal(getQuantityStep('kg'), 0.5);
    assert.equal(getQuantityStep('l'), 0.5);
    assert.equal(getQuantityStep('g'), 100);
    assert.equal(getQuantityStep('bag'), 1);
    assert.equal(getQuantityStep(null), 1);
  });
});

describe('getInitialClaimQuantity', () => {
  it('starts from the current claim when editing', () => {
    assert.equal(getInitialClaimQuantity({mine: 1.5, max: 3, step: 0.5}), 1.5);
  });
  it('starts at one step, capped by what is left', () => {
    assert.equal(getInitialClaimQuantity({mine: null, max: 4, step: 1}), 1);
    assert.equal(getInitialClaimQuantity({mine: null, max: 0.3, step: 0.5}), 0.3);
    assert.equal(getInitialClaimQuantity({mine: null, max: 0, step: 1}), 0);
  });
});
