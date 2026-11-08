'use client';

import {useEffect, useRef, useState, type FormEvent} from 'react';
import {useTranslations} from 'next-intl';
import {TabBar} from '@/components/event/TabBar';
import {Button, ButtonLink, buttonClassName} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {CopyButton} from '@/components/ui/CopyButton';
import {SegmentedControl} from '@/components/ui/SegmentedControl';
import {Stepper} from '@/components/ui/Stepper';
import {Tag} from '@/components/ui/Tag';
import {TextField} from '@/components/ui/TextField';
import {useEvent} from '@/hooks/use-event';
import {useOrigin} from '@/hooks/use-origin';
import {useStoredEvent} from '@/hooks/use-stored-event';
import {useRpcErrorMessage} from '@/i18n/errors';
import {useRouter} from '@/i18n/navigation';
import {
  inviteParticipant,
  removeParticipant,
  setRsvp,
  type EventDetails,
  type HostParticipantView,
  type ParticipantView,
  type Rsvp,
} from '@/lib/api';
import {getDeviceId} from '@/lib/device-store';
import {getEventSummary} from '@/lib/event-summary';
import {groupGuests} from '@/lib/guest-groups';
import {buildInviteUrl, buildWhatsAppUrl} from '@/lib/share-links';
import styles from './Guests.module.css';

/** How long RSVP changes wait before saving, so tapping + three times sends one request. */
const RSVP_SAVE_DELAY_MS = 500;

/** Screen 7 · "Quem vai" for participants, "Convidados" (invites and tracking) for the host. */
export function GuestsScreen({slug}: {slug: string}) {
  const stored = useStoredEvent(slug);
  if (stored === null) return <Status />;
  return <GuestsContent slug={slug} hostToken={stored?.hostToken} />;
}

function GuestsContent({slug, hostToken}: {slug: string; hostToken?: string}) {
  const t = useTranslations('Guests');
  const list = useTranslations('EventList');
  const common = useTranslations('Common');
  const {data, error, refresh} = useEvent(slug, hostToken);
  const rpcErrorMessage = useRpcErrorMessage();
  const router = useRouter();
  const isHost = Boolean(hostToken);
  const me = data?.me ?? null;

  // Participants see this tab only after joining; the host can manage guests without a name.
  useEffect(() => {
    if (data && !me && !isHost) router.replace(`/e/${slug}`);
  }, [data, me, isHost, slug, router]);

  if (!data) return error ? <Status message={rpcErrorMessage(error as {message?: string})} /> : <Status />;
  if (!me && !isHost) return <Status />;

  const summary = getEventSummary(data);
  const count = (rsvp: Rsvp | null) => data.participants.filter((participant) => participant.rsvp === rsvp).length;
  const myself = data.participants.find((participant) => participant.id === me) ?? null;
  const groups = groupGuests<ParticipantView | HostParticipantView>(data.participants);

  return (
    <div className={styles.screen}>
      <main className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>{isHost ? t('title') : t('titleParticipant')}</h1>
          <p className={styles.meta}>{data.event.title}</p>
        </header>

        <Card className={styles.summary}>
          <span className={styles.summaryTitle}>{t('total', {count: summary.peopleConfirmed})}</span>
          <div className={styles.tags}>
            <Tag tone="brand">{t('countYes', {count: count('yes')})}</Tag>
            {count('maybe') > 0 && <Tag>{list('maybe', {count: count('maybe')})}</Tag>}
            {count(null) > 0 && <Tag tone="ember">{t('countPending', {count: count(null)})}</Tag>}
            {count('no') > 0 && <Tag>{t('countNo', {count: count('no')})}</Tag>}
          </div>
        </Card>

        {myself && <MyAnswer key={myself.id} slug={slug} participant={myself} onSaved={refresh} />}

        {isHost && hostToken && <InviteForm slug={slug} hostToken={hostToken} onInvited={refresh} />}

        {groups.length === 0 && <p className={styles.notice}>{t('empty')}</p>}

        {groups.map((group) => (
          <section key={group.key} className={styles.section} aria-labelledby={`group-${group.key}`}>
            <h2 id={`group-${group.key}`} className={styles.sectionTitle}>
              {t(`section.${group.key}`)} · {group.participants.length}
            </h2>
            <ul className={styles.list}>
              {group.participants.map((participant) => (
                <GuestRow
                  key={participant.id}
                  slug={slug}
                  event={data.event}
                  participant={participant}
                  isMe={participant.id === me}
                  hostToken={hostToken}
                  onRemoved={refresh}
                />
              ))}
            </ul>
          </section>
        ))}

        {data.participants.length > 0 && (
          <ButtonLink href={`/e/${slug}/print/guests`} variant="ghost" className={styles.printLink}>
            {common('print')}
          </ButtonLink>
        )}
      </main>
      <TabBar slug={slug} isHost={isHost} />
    </div>
  );
}

/** This device's RSVP. Saves on its own a moment after the last change. */
function MyAnswer({slug, participant, onSaved}: {slug: string; participant: ParticipantView; onSaved: () => Promise<void>}) {
  const t = useTranslations('Guests');
  const rsvpText = useTranslations('Rsvp');
  const rpcErrorMessage = useRpcErrorMessage();
  const [rsvp, setRsvpChoice] = useState<Rsvp | null>(participant.rsvp);
  const [plusOnes, setPlusOnes] = useState(participant.plusOnes);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | {message?: string}>('idle');
  const pending = useRef<{rsvp: Rsvp; plusOnes: number} | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function flush() {
    const change = pending.current;
    if (!change) return;
    pending.current = null;
    try {
      await setRsvp({slug, deviceId: getDeviceId(), rsvp: change.rsvp, plusOnes: change.plusOnes});
      setSaveState('saved');
      void onSaved();
    } catch (failure) {
      setSaveState(failure as {message?: string});
    }
  }

  function schedule(nextRsvp: Rsvp, nextPlusOnes: number) {
    pending.current = {rsvp: nextRsvp, plusOnes: nextRsvp === 'no' ? 0 : nextPlusOnes};
    setSaveState('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), RSVP_SAVE_DELAY_MS);
  }

  // Leaving the tab right after a change still saves it.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      void flush();
    },
    // flush only reads refs and stable props; running it on every render would save too early.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const status =
    saveState === 'saving'
      ? t('saving')
      : saveState === 'saved'
        ? rsvpText('saved')
        : saveState === 'idle'
          ? ''
          : rpcErrorMessage(saveState);

  return (
    <Card className={styles.answer}>
      <span className={styles.answerTitle}>{t('yourAnswer')}</span>
      <SegmentedControl<Rsvp>
        label={rsvpText('question')}
        value={rsvp}
        onChange={(next) => {
          setRsvpChoice(next);
          schedule(next, plusOnes);
        }}
        options={[
          {value: 'yes', label: rsvpText('yes')},
          {value: 'maybe', label: rsvpText('maybe')},
          {value: 'no', label: rsvpText('no')},
        ]}
      />
      {rsvp !== null && rsvp !== 'no' && (
        <Stepper
          label={rsvpText('bringingOthers')}
          value={plusOnes}
          onChange={(next) => {
            setPlusOnes(next);
            schedule(rsvp, next);
          }}
          max={50}
          decreaseLabel={rsvpText('decreasePlusOnes')}
          increaseLabel={rsvpText('increasePlusOnes')}
          formatValue={(value) => (value > 0 ? `+${value}` : '0')}
        />
      )}
      <p
        className={typeof saveState === 'object' ? styles.answerError : styles.answerStatus}
        role={typeof saveState === 'object' ? 'alert' : 'status'}
      >
        {status}
      </p>
    </Card>
  );
}

/** Host only: creates a personal invite. The new guest then shows up below with its link. */
function InviteForm({slug, hostToken, onInvited}: {slug: string; hostToken: string; onInvited: () => Promise<void>}) {
  const t = useTranslations('Guests');
  const join = useTranslations('Join');
  const rpcErrorMessage = useRpcErrorMessage();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(join('nameRequired'));
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await inviteParticipant(slug, hostToken, trimmedName);
      setName('');
      await onInvited();
    } catch (failure) {
      setError(rpcErrorMessage(failure as {message?: string}));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className={styles.invite}>
      <form className={styles.inviteForm} onSubmit={handleSubmit} noValidate>
        <span className={styles.answerTitle}>{t('invite')}</span>
        <p className={styles.inviteHint}>{t('inviteHint')}</p>
        <div className={styles.inviteRow}>
          <TextField
            className={styles.inviteField}
            label={t('inviteName')}
            value={name}
            onChange={(changeEvent) => {
              setName(changeEvent.target.value);
              if (error) setError(null);
            }}
            maxLength={60}
            autoComplete="off"
            enterKeyHint="send"
            error={error}
          />
          <Button type="submit" isLoading={isSubmitting} className={styles.inviteButton}>
            {t('inviteSubmit')}
          </Button>
        </div>
      </form>
    </Card>
  );
}

type GuestRowProps = {
  slug: string;
  event: EventDetails;
  participant: ParticipantView | HostParticipantView;
  isMe: boolean;
  /** Present only for the host: unlocks tracking, invite links and removal. */
  hostToken?: string;
  onRemoved: () => Promise<void>;
};

function GuestRow({slug, event, participant, isMe, hostToken, onRemoved}: GuestRowProps) {
  const t = useTranslations('Guests');
  const common = useTranslations('Common');
  const origin = useOrigin();
  const hostData = hostToken && 'isLinked' in participant ? participant : null;

  // The invite link is useful until someone opens it on their phone and joins.
  const inviteUrl =
    hostData && hostData.inviteToken && !hostData.isLinked && origin
      ? buildInviteUrl(origin, slug, hostData.inviteToken)
      : null;
  const tracking = hostData?.invitedByHost
    ? hostData.isLinked
      ? t('joined')
      : hostData.openedAt
        ? t('opened')
        : t('notOpened')
    : null;

  return (
    <li className={styles.row}>
      <div className={styles.rowMain}>
        <span className={styles.rowName}>
          {participant.name}
          {isMe && <span className={styles.you}> · {common('you')}</span>}
        </span>
        {participant.plusOnes > 0 && participant.rsvp !== 'no' && (
          <Tag>{t('plusOnes', {count: participant.plusOnes})}</Tag>
        )}
      </div>
      {tracking && <span className={styles.rowTracking}>{tracking}</span>}
      {(inviteUrl || (hostToken && !isMe)) && (
        <div className={styles.rowActions}>
          {inviteUrl && (
            <>
              <CopyButton text={inviteUrl} label={t('copyInvite')} variant="secondary" />
              <a
                className={buttonClassName({variant: 'secondary'})}
                href={buildWhatsAppUrl(t('inviteMessage', {name: participant.name, title: event.title, url: inviteUrl}))}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('whatsappInvite')}
              </a>
            </>
          )}
          {hostToken && !isMe && (
            <RemoveButton slug={slug} hostToken={hostToken} participant={participant} onRemoved={onRemoved} />
          )}
        </div>
      )}
    </li>
  );
}

/** Two taps on purpose: removing also drops everything the person marked to bring. */
function RemoveButton({
  slug,
  hostToken,
  participant,
  onRemoved,
}: {
  slug: string;
  hostToken: string;
  participant: ParticipantView;
  onRemoved: () => Promise<void>;
}) {
  const t = useTranslations('Guests');
  const common = useTranslations('Common');
  const rpcErrorMessage = useRpcErrorMessage();
  const [step, setStep] = useState<'idle' | 'confirm' | 'removing'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setStep('removing');
    try {
      await removeParticipant(slug, hostToken, participant.id);
      await onRemoved();
    } catch (failure) {
      setError(rpcErrorMessage(failure as {message?: string}));
      setStep('idle');
    }
  }

  if (step === 'idle') {
    return (
      <>
        <Button variant="ghost" onClick={() => setStep('confirm')} aria-label={`${t('remove')}: ${participant.name}`}>
          {common('remove')}
        </Button>
        {error && (
          <p className={styles.answerError} role="alert">
            {error}
          </p>
        )}
      </>
    );
  }

  return (
    <div className={styles.confirm} role="group" aria-label={t('confirmRemove', {name: participant.name})}>
      <span className={styles.confirmText}>{t('confirmRemove', {name: participant.name})}</span>
      <Button variant="secondary" onClick={() => setStep('idle')} disabled={step === 'removing'}>
        {common('cancel')}
      </Button>
      <Button onClick={() => void remove()} isLoading={step === 'removing'}>
        {t('confirmRemoveYes')}
      </Button>
    </div>
  );
}

function Status({message}: {message?: string}) {
  const common = useTranslations('Common');
  return (
    <main className={styles.status} aria-busy={!message}>
      <p role={message ? 'alert' : 'status'} className={message ? styles.answerError : styles.statusText}>
        {message ?? common('loading')}
      </p>
    </main>
  );
}
