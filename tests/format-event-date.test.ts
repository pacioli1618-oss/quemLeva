import assert from 'node:assert/strict';
import {test} from 'node:test';
import {formatEventDate} from '../src/i18n/format-event-date';

const formatter = (locale: string) => ({
  dateTime: (value: Date, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, options).format(value),
});

test('formats the wall-clock date and time, with no time-zone shift', () => {
  assert.equal(formatEventDate(formatter('pt-BR'), '2026-12-20', '13:00:00', 'long'), 'domingo, 20 de dezembro · 13:00');
  assert.equal(formatEventDate(formatter('es'), '2026-12-24', '21:00:00', 'long'), 'jueves, 24 de diciembre · 21:00');
});

test('date without time, and no date at all', () => {
  assert.equal(formatEventDate(formatter('en'), '2026-12-31', null, 'long'), 'Thursday, December 31');
  assert.equal(formatEventDate(formatter('en'), null, '10:00:00'), '');
});
