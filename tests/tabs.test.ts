import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {getActiveTab, getEventTabs} from '@/lib/tabs';

describe('getEventTabs', () => {
  it('gives the host five tabs, in the mockup order', () => {
    assert.deepEqual(
      getEventTabs('abc123', true).map((tab) => tab.key),
      ['events', 'list', 'guests', 'expenses', 'share'],
    );
  });

  it('hides Expenses from participants', () => {
    assert.deepEqual(
      getEventTabs('abc123', false).map((tab) => tab.key),
      ['events', 'list', 'guests', 'share'],
    );
  });

  it('builds hrefs under the event', () => {
    const hrefs = Object.fromEntries(getEventTabs('abc123', true).map((tab) => [tab.key, tab.href]));
    assert.deepEqual(hrefs, {
      events: '/my-events',
      list: '/e/abc123',
      guests: '/e/abc123/guests',
      expenses: '/e/abc123/expenses',
      share: '/e/abc123/share',
    });
  });
});

describe('getActiveTab', () => {
  const cases: Array<[string, ReturnType<typeof getActiveTab>]> = [
    ['/my-events', 'events'],
    ['/e/abc123', 'list'],
    ['/e/abc123/', 'list'],
    ['/e/abc123/guests', 'guests'],
    ['/e/abc123/expenses', 'expenses'],
    ['/e/abc123/share', 'share'],
    ['/e/abc123/manage', null],
    ['/e/abc123/invite/xyz', null],
    ['/', null],
  ];
  for (const [path, expected] of cases) {
    it(`${path} → ${expected}`, () => assert.equal(getActiveTab(path), expected));
  }
});
