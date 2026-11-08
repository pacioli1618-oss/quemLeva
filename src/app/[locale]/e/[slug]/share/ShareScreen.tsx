'use client';

import {useTranslations} from 'next-intl';
import {TabBar} from '@/components/event/TabBar';
import {buttonClassName} from '@/components/ui/Button';
import {CopyButton} from '@/components/ui/CopyButton';
import {useEvent} from '@/hooks/use-event';
import {useOrigin} from '@/hooks/use-origin';
import {useStoredEvent} from '@/hooks/use-stored-event';
import {useFormatEventDate} from '@/i18n/dates';
import type {EventDetails} from '@/lib/api';
import {buildEventUrl, buildHostUrl, buildWhatsAppUrl, displayUrl} from '@/lib/share-links';
import styles from './Share.module.css';

/** Screen 3 · Share. Everyone can share the event link; only the host sees the host link. */
export function ShareScreen({slug}: {slug: string}) {
  const stored = useStoredEvent(slug);
  if (stored === null) return <main className={styles.screen} aria-busy="true" />;
  return <ShareContent slug={slug} hostToken={stored?.hostToken} />;
}

function ShareContent({slug, hostToken}: {slug: string; hostToken?: string}) {
  const t = useTranslations('Share');
  const origin = useOrigin();
  // Host view when this device holds the token; the share card only needs title, date and place.
  const {data} = useEvent(slug, hostToken);
  const isHost = Boolean(hostToken);

  const eventUrl = origin ? buildEventUrl(origin, slug) : '';
  const message = useShareMessage(data?.event ?? null, eventUrl);

  return (
    <main className={styles.screen}>
      <div className={styles.content}>
        <section className={styles.hero}>
          <div className={styles.heroIcon} aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
              <path d="M16 6l-4-4-4 4" />
              <path d="M12 2v13" />
            </svg>
          </div>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.lead}>{t('publicHint')}</p>
        </section>

        <section className={styles.card} aria-labelledby="event-link">
          <span id="event-link" className={styles.overline}>
            {t('publicLink')}
          </span>
          <div className={styles.linkBox}>
            <span className={styles.linkText}>{eventUrl ? displayUrl(eventUrl) : ' '}</span>
            <CopyButton text={eventUrl} variant="secondary" />
          </div>
          {/* External link styled as the main button: wa.me opens the WhatsApp app on phones. */}
          <a
            className={buttonClassName({size: 'cta', isFullWidth: true})}
            href={message ? buildWhatsAppUrl(message) : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!message || undefined}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z" />
            </svg>
            {t('whatsapp')}
          </a>
        </section>

        {message && (
          <section className={styles.card} aria-labelledby="share-message">
            <span id="share-message" className={styles.overline}>
              {t('messageLabel')}
            </span>
            <p className={styles.message}>{message}</p>
          </section>
        )}

        {isHost && hostToken && origin && <HostLinkCard url={buildHostUrl(origin, slug, hostToken)} />}
      </div>
      <TabBar slug={slug} isHost={isHost} activeTab="share" />
    </main>
  );
}

/** "Churrasco de domingo · dom., 29 de nov. · 13:00 · Casa da Tia Rosa", the call to action, the link. */
function useShareMessage(event: EventDetails | null, eventUrl: string) {
  const t = useTranslations('Share');
  const formatEventDate = useFormatEventDate();
  if (!event || !eventUrl) return '';
  const firstLine = [event.title, formatEventDate(event.eventDate, event.eventTime), event.location].filter(Boolean).join(' · ');
  return `${firstLine}\n${t('messageCall')}\n${eventUrl}`;
}

function HostLinkCard({url}: {url: string}) {
  const t = useTranslations('Share');
  return (
    <section className={styles.host} aria-labelledby="host-link">
      <span id="host-link" className={styles.hostTitle}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        {t('hostLink')}
      </span>
      <p className={styles.hostHint}>{t('hostHint')}</p>
      <CopyButton text={url} label={t('copyHostLink')} className={styles.hostButton} />
    </section>
  );
}
