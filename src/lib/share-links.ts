// Links people pass around. Framework-free and unit-tested: a wrong link here breaks the whole loop.

/** Public event link, the one that goes to the WhatsApp group. */
export function buildEventUrl(origin: string, slug: string) {
  return `${origin}/e/${encodeURIComponent(slug)}`;
}

/**
 * Host link. The token goes in the #fragment: browsers never send it to the server,
 * so it stays out of logs, analytics and link previews (docs/conventions.md, Routes).
 */
export function buildHostUrl(origin: string, slug: string, hostToken: string) {
  return `${origin}/e/${encodeURIComponent(slug)}/manage#${encodeURIComponent(hostToken)}`;
}

/** Reads the token back from location.hash ("#abc" → "abc"); empty when missing. */
export function readHostTokenFromHash(hash: string) {
  return decodeURIComponent(hash.replace(/^#/, '')).trim();
}

/** "quemleva.app.br/e/sh3v2kw2nc2s": what people see, without the protocol. */
export function displayUrl(url: string) {
  return url.replace(/^https?:\/\//, '');
}

/** Opens WhatsApp (app on phones, web elsewhere) with the message ready to send. */
export function buildWhatsAppUrl(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/** Personal invite: opens the join form with the guest's name filled in. */
export function buildInviteUrl(origin: string, slug: string, inviteToken: string) {
  return `${origin}/e/${encodeURIComponent(slug)}/invite/${encodeURIComponent(inviteToken)}`;
}
