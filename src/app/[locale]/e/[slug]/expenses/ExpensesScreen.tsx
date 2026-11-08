'use client';

import {useEffect, useState, type FormEvent} from 'react';
import {useTranslations} from 'next-intl';
import {TabBar} from '@/components/event/TabBar';
import {Button, buttonClassName} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {CopyButton} from '@/components/ui/CopyButton';
import {TextField} from '@/components/ui/TextField';
import {useEvent} from '@/hooks/use-event';
import {useStoredEvent} from '@/hooks/use-stored-event';
import {useFormatMoney} from '@/i18n/dates';
import {useRpcErrorMessage} from '@/i18n/errors';
import {useRouter} from '@/i18n/navigation';
import {updateEvent, type HostEventView} from '@/lib/api';
import {getExpenseSummary, normalizeSpliitUrl, type ExpenseSummary} from '@/lib/expenses';
import styles from './Expenses.module.css';

/** Where a new Spliit group is created. QuemLeva links to it; it does not call Spliit's API yet. */
const SPLIIT_CREATE_URL = 'https://spliit.app/groups/create';

/** Screen 9 · Expenses (host): who spent what, and the way to settle up in Spliit. */
export function ExpensesScreen({slug}: {slug: string}) {
  const stored = useStoredEvent(slug);
  const router = useRouter();
  const isHost = Boolean(stored?.hostToken);

  // Participants have no Expenses tab; a typed URL lands on the event instead.
  useEffect(() => {
    if (stored !== null && !isHost) router.replace(`/e/${slug}`);
  }, [stored, isHost, slug, router]);

  if (!stored?.hostToken) return <Status />;
  return <ExpensesContent slug={slug} hostToken={stored.hostToken} />;
}

function ExpensesContent({slug, hostToken}: {slug: string; hostToken: string}) {
  const t = useTranslations('Expenses');
  const {data, error, refresh} = useEvent(slug, hostToken);
  const rpcErrorMessage = useRpcErrorMessage();
  const formatMoney = useFormatMoney();

  if (!data) return error ? <Status message={rpcErrorMessage(error as {message?: string})} /> : <Status />;

  const summary = getExpenseSummary(data);
  const currency = data.event.currency;

  return (
    <div className={styles.screen}>
      <main className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.lead}>{t('intro')}</p>
        </header>

        <div className={styles.totals}>
          <Card className={styles.totalCard}>
            <span className={styles.totalLabel}>{t('total')}</span>
            <span className={styles.totalValue}>{formatMoney(summary.total, currency)}</span>
          </Card>
          <Card className={styles.totalCard}>
            <span className={styles.totalLabel}>{t('perPerson')}</span>
            <span className={styles.totalValue}>{summary.perPerson === null ? '—' : formatMoney(summary.perPerson, currency)}</span>
            {summary.perPerson !== null && (
              <span className={styles.totalHint}>{t('perPersonHint', {count: summary.peopleConfirmed})}</span>
            )}
          </Card>
        </div>

        <section className={styles.section} aria-labelledby="by-person">
          <h2 id="by-person" className={styles.sectionTitle}>
            {t('byPerson')}
          </h2>
          {summary.byParticipant.length === 0 ? (
            <p className={styles.notice}>{t('nobodySpent')}</p>
          ) : (
            <ul className={styles.list}>
              {summary.byParticipant.map((entry) => (
                <li key={entry.participantId} className={styles.row}>
                  <div className={styles.rowText}>
                    <span className={styles.rowName}>{entry.name}</span>
                    <span className={styles.rowItems}>{entry.itemNames.join(', ')}</span>
                  </div>
                  <span className={styles.rowAmount}>{formatMoney(entry.amount, currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <SpliitCard slug={slug} hostToken={hostToken} data={data} summary={summary} onSaved={refresh} />
      </main>
      <TabBar slug={slug} isHost />
    </div>
  );
}

type SpliitCardProps = {
  slug: string;
  hostToken: string;
  data: HostEventView;
  summary: ExpenseSummary;
  onSaved: () => Promise<void>;
};

/**
 * Settle up in Spliit, by hand for now: open Spliit, paste the summary, save the group link here.
 * The automatic group creation (unofficial Spliit API) comes after the MVP.
 */
function SpliitCard({slug, hostToken, data, summary, onSaved}: SpliitCardProps) {
  const t = useTranslations('Expenses');
  const rpcErrorMessage = useRpcErrorMessage();
  const savedUrl = data.event.spliitGroupUrl;
  const [isEditing, setIsEditing] = useState(!savedUrl);
  const [link, setLink] = useState(savedUrl ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const summaryText = useSummaryText(data, summary);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = normalizeSpliitUrl(link);
    if (!url) {
      setError(t('invalidLink'));
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await updateEvent(slug, hostToken, {spliitGroupUrl: url});
      await onSaved();
      setIsEditing(false);
    } catch (failure) {
      setError(rpcErrorMessage(failure as {message?: string}));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className={styles.spliit}>
      <h2 className={styles.spliitTitle}>{t('spliitTitle')}</h2>

      {savedUrl && !isEditing ? (
        <>
          <a className={buttonClassName({size: 'cta', isFullWidth: true})} href={savedUrl} target="_blank" rel="noopener noreferrer">
            {t('openGroup')}
          </a>
          <div className={styles.spliitActions}>
            <CopyButton text={summaryText} label={t('copySummary')} variant="secondary" />
            <Button variant="ghost" onClick={() => setIsEditing(true)}>
              {t('changeLink')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className={styles.spliitSteps}>{t('spliitSteps')}</p>
          <div className={styles.spliitActions}>
            <a className={buttonClassName({variant: 'secondary'})} href={SPLIIT_CREATE_URL} target="_blank" rel="noopener noreferrer">
              {t('createGroup')}
            </a>
            <CopyButton text={summaryText} label={t('copySummary')} variant="secondary" />
          </div>
          <form className={styles.linkForm} onSubmit={handleSubmit} noValidate>
            <TextField
              label={t('linkLabel')}
              placeholder={t('linkPlaceholder')}
              type="url"
              inputMode="url"
              value={link}
              onChange={(changeEvent) => {
                setLink(changeEvent.target.value);
                if (error) setError(null);
              }}
              error={error}
            />
            <Button type="submit" isLoading={isSaving}>
              {t('saveLink')}
            </Button>
          </form>
        </>
      )}
    </Card>
  );
}

/** Plain text to paste into Spliit or the family group: names, items, amounts and the split. */
function useSummaryText(data: HostEventView, summary: ExpenseSummary) {
  const t = useTranslations('Expenses');
  const formatMoney = useFormatMoney();
  const currency = data.event.currency;
  const lines = [
    t('summaryHeader', {title: data.event.title}),
    ...summary.byParticipant.map((entry) => `• ${entry.name}: ${formatMoney(entry.amount, currency)} (${entry.itemNames.join(', ')})`),
    t('summaryTotal', {total: formatMoney(summary.total, currency)}),
  ];
  if (summary.perPerson !== null) {
    lines.push(t('summaryPerPerson', {count: summary.peopleConfirmed, amount: formatMoney(summary.perPerson, currency)}));
  }
  return lines.join('\n');
}

function Status({message}: {message?: string}) {
  const common = useTranslations('Common');
  return (
    <main className={styles.status} aria-busy={!message}>
      <p role={message ? 'alert' : 'status'} className={message ? styles.error : styles.statusText}>
        {message ?? common('loading')}
      </p>
    </main>
  );
}
