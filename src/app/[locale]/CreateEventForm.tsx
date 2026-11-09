'use client';

import {useState, type FormEvent} from 'react';
import {useLocale, useTranslations} from 'next-intl';
import {Button} from '@/components/ui/Button';
import {EventFields, type EventFieldValues} from '@/components/event/EventFields';
import {LegalLinks} from '@/components/legal/LegalLinks';
import {TextField} from '@/components/ui/TextField';
import {useRpcErrorMessage} from '@/i18n/errors';
import {defaultCurrency} from '@/i18n/locales';
import {useRouter} from '@/i18n/navigation';
import {createEvent} from '@/lib/api';
import {getDeviceId, rememberEvent} from '@/lib/device-store';
import styles from './CreateEvent.module.css';

export function CreateEventForm() {
  const t = useTranslations('CreateEvent');
  const common = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();
  const rpcErrorMessage = useRpcErrorMessage();

  const [values, setValues] = useState<EventFieldValues>({
    title: '',
    eventDate: '',
    eventTime: '',
    location: '',
    kind: 'barbecue',
    adults: 10,
    kids: 0,
  });
  const [hostName, setHostName] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const {title, eventDate, eventTime, location, kind, adults, kids} = values;
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
      <EventFields
        values={values}
        onChange={(patch) => {
          setValues((current) => ({...current, ...patch}));
          if (patch.title !== undefined && titleError) setTitleError(null);
        }}
        titleError={titleError}
        afterLocation={
          <TextField
            label={`${t('hostName')} (${t('optional')})`}
            hint={t('hostNameHint')}
            value={hostName}
            onChange={(event) => setHostName(event.target.value)}
            maxLength={60}
            autoComplete="given-name"
          />
        }
      />

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
