import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {buildEventUrl, buildHostUrl, buildInviteUrl, buildWhatsAppUrl, displayUrl, readHostTokenFromHash} from '@/lib/share-links';

const origin = 'https://quemleva.app.br';

describe('share links', () => {
  it('builds the public event link', () => {
    assert.equal(buildEventUrl(origin, 'sh3v2kw2nc2s'), 'https://quemleva.app.br/e/sh3v2kw2nc2s');
  });

  it('keeps the host token in the fragment, never in the path or query', () => {
    const url = new URL(buildHostUrl(origin, 'sh3v2kw2nc2s', 'tok123'));
    assert.equal(url.pathname, '/e/sh3v2kw2nc2s/manage');
    assert.equal(url.search, '');
    assert.equal(url.hash, '#tok123');
  });

  it('reads the token back from the hash', () => {
    const url = new URL(buildHostUrl(origin, 'x', 'hafjntu9vh9gm6geqkej9qbumq3fge9q'));
    assert.equal(readHostTokenFromHash(url.hash), 'hafjntu9vh9gm6geqkej9qbumq3fge9q');
    assert.equal(readHostTokenFromHash(''), '');
    assert.equal(readHostTokenFromHash('#'), '');
  });

  it('shows links without the protocol', () => {
    assert.equal(displayUrl('https://quemleva.app.br/e/abc'), 'quemleva.app.br/e/abc');
    assert.equal(displayUrl('http://localhost:3000/e/abc'), 'localhost:3000/e/abc');
  });

  it('encodes the WhatsApp message, accents and line breaks included', () => {
    const url = new URL(buildWhatsAppUrl('Churrasco · dom., 29 de nov.\nMarque aqui: https://quemleva.app.br/e/abc'));
    assert.equal(url.hostname, 'wa.me');
    assert.equal(url.searchParams.get('text'), 'Churrasco · dom., 29 de nov.\nMarque aqui: https://quemleva.app.br/e/abc');
  });
});

describe('buildInviteUrl', () => {
  it('puts the invite token in the path, where the invite route reads it', () => {
    assert.equal(buildInviteUrl('https://quemleva.app.br', 'sh3v2kw2nc2s', 'tok123'), 'https://quemleva.app.br/e/sh3v2kw2nc2s/invite/tok123');
  });
});
