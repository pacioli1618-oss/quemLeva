'use client';

import {useState, type FormEvent} from 'react';
import {useLocale, useTranslations} from 'next-intl';
import {Button} from '@/components/ui/Button';
import {LegalLinks} from '@/components/legal/LegalLinks';
import {Card} from '@/components/ui/Card';
import {ChipGroup} from '@/components/ui/Chip';
import {Stepper} from '@/components/ui/Stepper';
import {TextField} from '@/components/ui/TextField';
import {useRpcErrorMessage} from '@/i18n/errors';
import {defaultCurrency} from '@/i18n/locales';
import {useRouter} from '@/i18n/navigation';
import {createEvent, type EventKind} from '@/lib/api';
import {getDeviceId, rememberEvent} from '@/lib/device-store';
import styles from './CreateEvent.module.css';

const KINDS: readonly EventKind[] = ['barbecue', 'lunch', 'birthday', 'christmas', 'other'];

export function CreateEventForm() {
  const t = useTranslations('CreateEvent');
  const kinds = useTranslations('EventKind');
  const common = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();
  const rpcErrorMessage = useRpcErrorMessage();

  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');
  const [hostName, setHostName] = useState('');
  const [kind, setKind] = useState<EventKind>('barbecue');
  const [adults, setAdults] = useState(10);
  const [kids, setKids] = useState(0);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError(t('titleRequired'));
      return;
    }
    setTitleError(null);
    setFormError(null);
    setIsSubmitting(true);

    try {
      const deviceId = getDeviceId();
      const created = await createEvent({
        title: trimmedTitle,
        eventDate: eventDate || undefined,
        eventTime: eventTime || undefined,
        location: location.trim() || undefined,
        adults,
        kids,
        deviceId,
        hostName: hostName.trim() || undefined,
        locale,
        currency: defaultCurrency[locale],
        kind,
      });
      // The host token exists only here and on this device from now on: save it before moving on.
      rememberEvent({
        slug: created.slug,
        title: trimmedTitle,
        eventDate: eventDate || null,
        role: 'host',
        hostToken: created.hostToken,
      });
      router.push(`/e/${created.slug}/items`);
    } catch (error) {
      setFormError(rpcErrorMessage(error as {message?: string}));
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <Card variant="large" className={styles.fields}>
        <TextField
          label={t('name')}
          placeholder={t('namePlaceholder')}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          autoComplete="off"
          error={titleError}
          required
        />
        <div className={styles.row}>
          <TextField label={t('date')} type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
          <TextField label={t('time')} type="time" value={eventTime} onChange={(event) => setEventTime(event.target.value)} />
        </div>
        <TextField
          label={`${t('location')} (${t('optional')})`}
          placeholder={t('locationPlaceholder')}
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          maxLength={200}
        />
        <TextField
          label={`${t('hostName')} (${t('optional')})`}
          hint={t('hostNameHint')}
          value={hostName}
          onChange={(event) => setHostName(event.target.value)}
          maxLength={60}
          autoComplete="given-name"
        />
        <div className={styles.kind}>
          <span className={styles.groupLabel}>{t('kind')}</span>
          <ChipGroup
            label={t('kind')}
            value={kind}
            onChange={setKind}
            options={KINDS.map((value) => ({value, label: kinds(value)}))}
          />
        </div>
        <div className={styles.people}>
          <Stepper
            label={t('adults')}
            value={adults}
            onChange={setAdults}
            max={1000}
            decreaseLabel={t('decreaseAdults')}
            increaseLabel={t('increaseAdults')}
          />
          <Stepper
            label={t('kids')}
            value={kids}
            onChange={setKids}
            max={1000}
            decreaseLabel={t('decreaseKids')}
            increaseLabel={t('increaseKids')}
          />
        </div>
      </Card>

      <div className={styles.footer}>
        {formError && (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        )}
        <Button type="submit" size="cta" isFullWidth isLoading={isSubmitting}>
          {t('submit')}
        </Button>
        <p className={styles.tagline}>{common('tagline')}</p>
        <LegalLinks />
      </div>
    </form>
  );
}
