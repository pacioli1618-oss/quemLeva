import type {ReactNode} from 'react';
import {useFormatter, useTranslations} from 'next-intl';
import {Logo} from '@/components/brand/Logo';
import {Link} from '@/i18n/navigation';
import {site} from '@/lib/site';
import {LegalLinks} from './LegalLinks';
import styles from './LegalPage.module.css';

type Namespace = 'About' | 'Privacy' | 'Terms';

type LegalPageProps = {
  namespace: Namespace;
  /** Section keys under <namespace>.sections, in reading order. Each has a title and p1, p2… */
  sections: readonly string[];
  /** Privacy and Terms carry the date of their current text. */
  showUpdatedAt?: boolean;
};

const MAX_PARAGRAPHS = 6;

// Section keys are built at runtime (sections.<key>.p1…), which the typed translator can't check;
// npm run i18n:check still guarantees every locale has the same keys.
type LooseTranslator = {
  (key: string): string;
  rich: (key: string, values: Record<string, string | ((chunks: ReactNode) => ReactNode)>) => ReactNode;
  has: (key: string) => boolean;
  raw: (key: string) => string;
};

/** Shared layout for /about, /privacy and /terms: short sections of plain text, contact at the end. */
export function LegalPage({namespace, sections, showUpdatedAt = false}: LegalPageProps) {
  const t = useTranslations(namespace) as unknown as LooseTranslator;
  const legal = useTranslations('Legal');
  const format = useFormatter();

  const values = {operator: site.operator, host: site.host ?? ''};
  const tags = {
    repo: (chunks: ReactNode) => (
      <a href={site.repositoryUrl} target="_blank" rel="noopener noreferrer">
        {chunks}
      </a>
    ),
  };

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <Link href="/" aria-label="QuemLeva">
          <Logo />
        </Link>
        <Link href="/" className={styles.back}>
          {legal('back')}
        </Link>
      </header>

      <article className={styles.article}>
        <h1 className={styles.title}>{t('title')}</h1>
        {showUpdatedAt && (
          <p className={styles.updated}>
            {legal('updated', {
              date: format.dateTime(new Date(`${site.legalUpdatedAt}T12:00:00Z`), {dateStyle: 'long', timeZone: 'UTC'}),
            })}
          </p>
        )}
        <p className={styles.intro}>{t('intro')}</p>

        {sections.map((key) => (
          <section key={key} className={styles.section} aria-labelledby={`section-${key}`}>
            <h2 id={`section-${key}`} className={styles.sectionTitle}>
              {t(`sections.${key}.title`)}
            </h2>
            {Array.from({length: MAX_PARAGRAPHS}, (_, index) => `sections.${key}.p${index + 1}`)
              .filter((path) => t.has(path))
              // "Links start with {host}" only makes sense when the site URL is known.
              .filter((path) => site.host || !t.raw(path).includes('{host}'))
              .map((path) => (
                <p key={path}>{t.rich(path, {...values, ...tags})}</p>
              ))}
          </section>
        ))}

        <section className={styles.section} aria-labelledby="section-contact">
          <h2 id="section-contact" className={styles.sectionTitle}>
            {legal('contactTitle')}
          </h2>
          <p>
            {legal.rich('contactBody', {
              contact: site.contact.label,
              link: (chunks) => <a href={site.contact.href}>{chunks}</a>,
            })}
          </p>
        </section>
      </article>

      <footer className={styles.footer}>
        <LegalLinks />
      </footer>
    </main>
  );
}
