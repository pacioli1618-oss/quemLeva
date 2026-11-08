#!/usr/bin/env node
// Checks translations against the source locale (pt-BR):
//  - every source key exists in the other locales, and there are no extra keys;
//  - every message is valid ICU;
//  - a locale never uses an argument the source does not provide (an unknown {name} breaks in production).
// Usage: node scripts/check-messages.mjs   (exits with code 1 on any problem)

import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {parse, TYPE} from '@formatjs/icu-messageformat-parser';

const SOURCE_LOCALE = 'pt-BR';
const messagesDir = new URL('../messages/', import.meta.url).pathname;

const flatten = (object, prefix = '') =>
  Object.entries(object).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null ? flatten(value, `${prefix}${key}.`) : [[`${prefix}${key}`, value]],
  );

const collectArguments = (elements, found = new Set()) => {
  for (const element of elements) {
    if ([TYPE.argument, TYPE.number, TYPE.date, TYPE.time].includes(element.type)) found.add(element.value);
    if (element.type === TYPE.plural || element.type === TYPE.select) {
      found.add(element.value);
      for (const option of Object.values(element.options)) collectArguments(option.value, found);
    }
    if (element.type === TYPE.tag) collectArguments(element.children, found);
  }
  return found;
};

const loadMessages = (locale) => new Map(flatten(JSON.parse(readFileSync(join(messagesDir, `${locale}.json`), 'utf8'))));

const problems = [];
const source = loadMessages(SOURCE_LOCALE);
const sourceArguments = new Map();

for (const [key, message] of source) {
  try {
    sourceArguments.set(key, collectArguments(parse(message)));
  } catch (error) {
    problems.push(`${SOURCE_LOCALE} ${key}: invalid ICU (${error.message})`);
  }
}

const otherLocales = readdirSync(messagesDir)
  .filter((file) => file.endsWith('.json') && file !== `${SOURCE_LOCALE}.json`)
  .map((file) => file.replace(/\.json$/, ''));

for (const locale of otherLocales) {
  const messages = loadMessages(locale);
  for (const key of source.keys()) if (!messages.has(key)) problems.push(`${locale}: missing key ${key}`);
  for (const [key, message] of messages) {
    if (!source.has(key)) {
      problems.push(`${locale}: key ${key} does not exist in ${SOURCE_LOCALE}`);
      continue;
    }
    try {
      const used = collectArguments(parse(message));
      const allowed = sourceArguments.get(key) ?? new Set();
      for (const argument of used) {
        if (!allowed.has(argument)) problems.push(`${locale} ${key}: uses {${argument}}, which ${SOURCE_LOCALE} does not provide`);
      }
    } catch (error) {
      problems.push(`${locale} ${key}: invalid ICU (${error.message})`);
    }
  }
}

if (problems.length) {
  console.error(`i18n: ${problems.length} problem(s)\n` + problems.map((problem) => `  - ${problem}`).join('\n'));
  process.exit(1);
}
console.log(`i18n: ok — ${source.size} messages in ${[SOURCE_LOCALE, ...otherLocales].join(', ')}`);
