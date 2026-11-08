'use client';

import {useState, type FormEvent} from 'react';
import {useTranslations} from 'next-intl';
import {Logo} from '@/components/brand/Logo';
import {Button} from '@/components/ui/Button';
import {SegmentedControl} from '@/components/ui/SegmentedControl';
import {Stepper} from '@/components/ui/Stepper';
import {TextField} from '@/components/ui/TextField';
import {useFormatEventDate} from '@/i18n/dates';
import {useRpcErrorMessage} from '@/i18n/errors';
import {joinEvent, setRsvp, type EventView, type Rsvp} from '@/lib/api';
import {getDeviceId, rememberEvent} from '@/lib/device-store';
import {getEventSummary} from '@/lib/event-summary';
import styles from './JoinForm.module.css';

type JoinFormProps = {
  slug: string;
  view: Pick<EventView, 'event' | 'items' | 'participants'>;
  isHost: boolean;
  /** Personal invite: binds the invited participant to this device and prefills the name. */
  inviteToken?: string;
  initialName?: string;
  onJoined: () => void | Promise<void>;
};

/** Screen 4 · Join the event: a name (saved on this phone), RSVP and plus-ones. */
export function JoinForm({slug, view, isHost, inviteToken, initialName = '', onJoined}: JoinFormProps) {
  const t = useTranslations('Join');
  const rsvpText = useTranslations('Rsvp');
  const list = useTranslations('EventList');
  const formatEventDate = useFormatEventDate();
  const rpcErrorMessage = useRpcErrorMessage();
  const summary = getEventSummary(view);

  const [name, setName] = useState(initialName);
  const [rsvp, setRsvpChoice] = useState<Rsvp | null>(null);
  const [plusOnes, setPlusOnes] = useState(0);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(t('nameRequired'));
      return;
    }
    setNameError(null);
    setFormError(null);
    setIsSubmitting(true);
    try {
      const deviceId = getDeviceId();
      const participantId = (await joinEvent({slug, deviceId, name: trimmedName, inviteToken})) as string;
      if (rsvp) await setRsvp({slug, deviceId, rsvp, plusOnes: rsvp === 'no' ? 0 : plusOnes});
      rememberEvent({
        slug,
        title: view.event.title,
        eventDate: view.event.eventDate,
        role: isHost ? 'host' : 'participant',
        participantId,
      });
      await onJoined();
    } catch (failure) {
      setFormError(rpcErrorMessage(failure as {message?: string}));
      setIsSubmitting(false);
    }
  }

  const {event} = view;
  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <Logo />
      </header>

      <section className={styles.hero} aria-labelledby="event-title">
        {/* The host can land here too (created the event without a name): no "you were invited". */}
        {!isHost && <span className={styles.heroLabel}>{t('invitedLabel')}</span>}
        <h1 id="event-title" className={styles.heroTitle}>
          {event.title}
        </h1>
        <div className={styles.heroMeta}>
          {event.eventDate && <span>{formatEventDate(event.eventDate, event.eventTime, 'long')}</span>}
          {event.location && <span>{event.location}</span>}
        </div>
        <div className={styles.heroTags}>
          {summary.peopleConfirmed > 0 && <span className={styles.heroTag}>{list('confirmed', {count: summary.peopleConfirmed})}</span>}
          {summary.itemsMissing > 0 && <span className={styles.heroTag}>{list('missingItems', {count: summary.itemsMissing})}</span>}
        </div>
      </section>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          className={styles.nameField}
          label={t('whoAreYou')}
          placeholder={t('namePlaceholder')}
          hint={inviteToken && initialName ? t('invitedAs', {name: initialName}) : t('nameHint')}
          value={name}
          onChange={(changeEvent) => {
            setName(changeEvent.target.value);
            if (nameError) setNameError(null);
          }}
          maxLength={60}
          autoComplete="given-name"
          enterKeyHint="go"
          error={nameError}
        />

        <div className={styles.rsvp}>
          <span className={styles.rsvpLabel} aria-hidden="true">
            {rsvpText('question')}
          </span>
          <SegmentedControl<Rsvp>
            label={rsvpText('question')}
            value={rsvp}
            onChange={setRsvpChoice}
            options={[
              {value: 'yes', label: rsvpText('yes')},
              {value: 'maybe', label: rsvpText('maybe')},
              {value: 'no', label: rsvpText('no')},
            ]}
          />
          {rsvp !== 'no' && (
            <Stepper
              label={rsvpText('bringingOthers')}
              value={plusOnes}
              onChange={setPlusOnes}
              max={50}
              decreaseLabel={rsvpText('decreasePlusOnes')}
              increaseLabel={rsvpText('increasePlusOnes')}
              formatValue={(value) => (value > 0 ? `+${value}` : '0')}
            />
          )}
        </div>

        <div className={styles.footer}>
          {formError && (
            <p className={styles.error} role="alert">
              {formError}
            </p>
          )}
          <Button type="submit" size="cta" isFullWidth isLoading={isSubmitting}>
            {t('submit')}
          </Button>
        </div>
      </form>
    </main>
  );
}
