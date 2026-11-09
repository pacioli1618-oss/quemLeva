// Who runs QuemLeva and how to reach them: shown on the About, Privacy and Terms pages.
// Change here (or with the env vars) when the operator, repository or contact changes.

const repositoryUrl = 'https://github.com/pacioli1618-oss/quemLeva';
const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || null;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || null;

export const site = {
  operator: 'GR1618',
  repositoryUrl,
  /** Without an e-mail, people are pointed to the repository's issues page. */
  contact: contactEmail
    ? {label: contactEmail, href: `mailto:${contactEmail}`}
    : {label: 'github.com/pacioli1618-oss/quemLeva/issues', href: `${repositoryUrl}/issues`},
  /** "quemleva.gr1618.io", for "QuemLeva links start with …"; null when unknown. */
  host: siteUrl ? new URL(siteUrl).host : null,
  /** Date of the current Privacy and Terms text (YYYY-MM-DD). */
  legalUpdatedAt: '2026-11-08',
} as const;
