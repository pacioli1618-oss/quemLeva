'use client';

import {useEffect, useState, type FormEvent} from 'react';
import {useFormatter, useTranslations} from 'next-intl';
import {SuspendedNotice} from '@/components/event/SuspendedNotice';
import {Button, ButtonLink} from '@/components/ui/Button';
import {Chip} from '@/components/ui/Chip';
import {ProgressBar} from '@/components/ui/ProgressBar';
import {Stepper} from '@/components/ui/Stepper';
import {TextField} from '@/components/ui/TextField';
import {useClaimSummary} from '@/components/event/use-claim-summary';
import {useEvent} from '@/hooks/use-event';
import {useStoredEvent} from '@/hooks/use-stored-event';
import {useRpcErrorMessage} from '@/i18n/errors';
import {Link, useRouter} from '@/i18n/navigation';
import {useCategoryLabel, useFormatAmount} from '@/i18n/units';
import {setClaim, type EventView, type ItemView} from '@/lib/api';
import {getDeviceId} from '@/lib/device-store';
import {getItemStatus} from '@/lib/item-status';
import {getInitialClaimQuantity, getQuantityStep, parseQuantity} from '@/lib/quantity';
import styles from './Claim.module.css';

type ClaimScreenProps = {slug: string; itemId: string};

/** Screen 6 · "Eu levo": how much of one item this device brings, with an optional note. */
export function ClaimScreen({slug, itemId}: ClaimScreenProps) {
  const stored = useStoredEvent(slug);
  if (stored === null) return <Status />;
  return <ClaimContent slug={slug} itemId={itemId} hostToken={stored?.hostToken} />;
}

function ClaimContent({slug, itemId, hostToken}: ClaimScreenProps & {hostToken?: string}) {
  const {data, error, refresh} = useEvent(slug, hostToken);
  const router = useRouter();
  const rpcErrorMessage = useRpcErrorMessage();
  const isJoined = Boolean(data?.me);

  // Claims need a name in the event: send people who skipped the join step back to it.
  useEffect(() => {
    if (data && !isJoined) router.replace(`/e/${slug}`);
  }, [data, isJoined, slug, router]);

  if (!data) return error ? <Status message={rpcErrorMessage(error as {message?: string})} slug={slug} /> : <Status />;
  if (!isJoined) return <Status />;

  // Suspended: "Eu levo" is paused (the server refuses it too); the host can reactivate here.
  if (data.event.suspendedAt) {
    return (
      <main className={styles.status}>
        <SuspendedNotice slug={slug} onReactivated={refresh} />
        <BackToEvent slug={slug} />
      </main>
    );
  }

  const item = data.items.find((candidate) => candidate.id === itemId);
  if (!item) return <Status message={rpcErrorMessage({message: 'item_not_found'})} slug={slug} />;

  // Keyed by item so a realtime refresh never resets what the person is typing.
  return <ClaimForm key={item.id} slug={slug} view={data} item={item} onConflict={refresh} />;
}

type ClaimFormProps = {
  slug: string;
  view: Pick<EventView, 'event' | 'me'>;
  item: ItemView;
  onConflict: () => Promise<void>;
};

function ClaimForm({slug, view, item, onConflict}: ClaimFormProps) {
  const t = useTranslations('Claim');
  const common = useTranslations('Common');
  const list = useTranslations('EventList');
  const formatAmount = useFormatAmount();
  const categoryLabel = useCategoryLabel();
  const summarizeClaims = useClaimSummary();
  const rpcErrorMessage = useRpcErrorMessage();
  const router = useRouter();
  const format = useFormatter();

  const mine = item.claims.find((claim) => claim.participantId === view.me) ?? null;
  const status = getItemStatus(item);
  const isOpen = item.quantityNeeded === null;
  const step = getQuantityStep(item.unit);
  // What this device may claim: what is still missing plus what it already holds.
  const max = isOpen ? 0 : Math.round(((status.remaining ?? 0) + (mine?.quantity ?? 0)) * 100) / 100;
  const isFull = !isOpen && max === 0;

  const [quantity, setQuantity] = useState(() => getInitialClaimQuantity({mine: mine?.quantity ?? null, max, step}));
  const [note, setNote] = useState(mine?.note ?? '');
  // Typed as text in the local format ("45,90"); parsed on submit like quantities.
  const [spent, setSpent] = useState(() =>
    mine?.amountSpent ? format.number(mine.amountSpent, {useGrouping: false, maximumFractionDigits: 2}) : '',
  );
  const [spentError, setSpentError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<'save' | 'remove' | null>(null);

  async function save(nextQuantity: number, action: 'save' | 'remove', amountSpent?: number) {
    setFormError(null);
    setPending(action);
    try {
      await setClaim({
        slug,
        deviceId: getDeviceId(),
        itemId: item.id,
        quantity: nextQuantity,
        note: note.trim() || undefined,
        // Omitted means "no amount": the claim is written whole, so an empty field clears it.
        amountSpent,
      });
      router.replace(`/e/${slug}`);
    } catch (failure) {
      setFormError(rpcErrorMessage(failure as {message?: string; details?: string}, item.unit));
      setPending(null);
      // Someone else claimed in the meantime: reload so the limits match the database.
      void onConflict();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountSpent = parseQuantity(spent);
    if (amountSpent === null) {
      setSpentError(t('invalidAmount'));
      return;
    }
    setSpentError(null);
    void save(isOpen ? 1 : quantity, 'save', amountSpent);
  }

  const who = summarizeClaims(item, view.me);
  const minQuantity = Math.min(step, max);

  return (
    <main className={styles.screen}>
      <div className={styles.topBar}>
        <Link href={`/e/${slug}`} className={styles.back} aria-label={common('back')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <span className={styles.topTitle}>{view.event.title}</span>
      </div>

      <section className={styles.itemCard} aria-labelledby="item-name">
        {item.category && <span className={styles.overline}>{categoryLabel(item.category)}</span>}
        <h1 id="item-name" className={styles.itemName}>
          {item.name}
        </h1>
        {status.remaining !== null && status.remaining > 0 && (
          <span className={styles.remaining}>
            {t('remaining', {count: status.remaining, amount: formatAmount(status.remaining, item.unit)})}
          </span>
        )}
        {item.quantityNeeded !== null && (
          <ProgressBar
            tone="ember"
            value={status.progress}
            label={list('itemProgress', {
              claimed: formatAmount(item.quantityClaimed, item.unit),
              needed: formatAmount(item.quantityNeeded, item.unit),
            })}
          />
        )}
        <span className={styles.who}>{who || list('nobodyYet')}</span>
      </section>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {isOpen ? (
          <p className={styles.hint}>{t('openItem')}</p>
        ) : isFull ? (
          <p className={styles.hint} role="status">
            {rpcErrorMessage({message: 'quantity_exceeds_remaining', details: '0'})}
          </p>
        ) : (
          <div className={styles.amount}>
            <Stepper
              label={t('howMuch')}
              value={quantity}
              onChange={setQuantity}
              min={minQuantity}
              max={max}
              step={step}
              decreaseLabel={t('decrease')}
              increaseLabel={t('increase')}
              formatValue={(value) => formatAmount(value, item.unit)}
            />
            {max > minQuantity && (
              <div className={styles.quickPick}>
                <Chip isSelected={quantity === max} onClick={() => setQuantity(max)}>
                  {t('allRemaining', {amount: formatAmount(max, item.unit)})}
                </Chip>
              </div>
            )}
          </div>
        )}

        {!isFull && (
          <TextField
            label={t('note')}
            placeholder={t('notePlaceholder')}
            value={note}
            onChange={(changeEvent) => setNote(changeEvent.target.value)}
            maxLength={120}
            enterKeyHint="next"
          />
        )}

        {!isFull && (
          <TextField
            label={`${t('spent')} (${view.event.currency})`}
            hint={t('spentHint')}
            placeholder={format.number(0, {minimumFractionDigits: 2})}
            inputMode="decimal"
            value={spent}
            onChange={(changeEvent) => {
              setSpent(changeEvent.target.value);
              if (spentError) setSpentError(null);
            }}
            maxLength={12}
            enterKeyHint="done"
            error={spentError}
          />
        )}

        <div className={styles.footer}>
          {formError && (
            <p className={styles.error} role="alert">
              {formError}
            </p>
          )}
          {!isFull && (
            <Button type="submit" size="cta" isFullWidth isLoading={pending === 'save'} disabled={pending !== null}>
              {t('submit')}
            </Button>
          )}
          {mine && (
            <Button
              variant="ghost"
              isFullWidth
              isLoading={pending === 'remove'}
              disabled={pending !== null}
              onClick={() => void save(0, 'remove')}
            >
              {t('giveUp')}
            </Button>
          )}
        </div>
      </form>
    </main>
  );
}

function BackToEvent({slug}: {slug: string}) {
  const common = useTranslations('Common');
  return (
    <ButtonLink href={`/e/${slug}`} variant="secondary">
      {common('back')}
    </ButtonLink>
  );
}

function Status({message, slug}: {message?: string; slug?: string}) {
  const common = useTranslations('Common');
  return (
    <main className={styles.status} aria-busy={!message}>
      <p role={message ? 'alert' : 'status'} className={message ? styles.error : styles.statusText}>
        {message ?? common('loading')}
      </p>
      {message && slug && <BackToEvent slug={slug} />}
    </main>
  );
}
