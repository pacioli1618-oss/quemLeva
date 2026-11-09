'use client';

import {useEffect, useState, type FormEvent} from 'react';
import {useTranslations} from 'next-intl';
import {EventFields, type EventFieldValues} from '@/components/event/EventFields';
import {Button} from '@/components/ui/Button';
import {useEvent} from '@/hooks/use-event';
import {useStoredEvent} from '@/hooks/use-stored-event';
import {useRpcErrorMessage} from '@/i18n/errors';
import {useRouter} from '@/i18n/navigation';
import {updateEvent, type EventDetails} from '@/lib/api';
import {updateStoredEvent} from '@/lib/device-store';
import styles from './EditEvent.module.css';

/** Edit event (host), opened from the ⋮ menu in "My events". Guests are sent to the event. */
export function EditEventScreen({slug}: {slug: string}) {
  const stored = useStoredEvent(slug);
  const router = useRouter();
  const isHost = Boolean(stored?.hostToken);

  useEffect(() => {
    if (stored !== null && !isHost) router.replace(`/e/${slug}`);
  }, [stored, isHost, slug, router]);

  if (!stored?.hostToken) return <Status />;
  return <EditEventLoader slug={slug} hostToken={stored.hostToken} />;
}

function EditEventLoader({slug, hostToken}: {slug: string; hostToken: string}) {
  const {data, error} = useEvent(slug, hostToken);
  const rpcErrorMessage = useRpcErrorMessage();
  if (!data) return error ? <Status message={rpcErrorMessage(error as {message?: string})} /> : <Status />;
  // Keyed by event: the form starts from what the server has, once.
  return <EditEventForm key={data.event.id} slug={slug} hostToken={hostToken} event={data.event} />;
}

function toFieldValues(event: EventDetails): EventFieldValues {
  return {
    title: event.title,
    eventDate: event.eventDate ?? '',
    eventTime: event.eventTime ? event.eventTime.slice(0, 5) : '',
    location: event.location ?? '',
    kind: event.kind,
    adults: event.adults,
    kids: event.kids,
  };
}

function EditEventForm({slug, hostToken, event}: {slug: string; hostToken: string; event: EventDetails}) {
  const t = useTranslations('EditEvent');
  const create = useTranslations('CreateEvent');
  const common = useTranslations('Common');
  const router = useRouter();
  const rpcErrorMessage = useRpcErrorMessage();

  const [values, setValues] = useState(() => toFieldValues(event));
  const [titleError, setTitleError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    const title = values.title.trim();
    if (!title) {
      setTitleError(create('titleRequired'));
      return;
    }
    setFormError(null);
    setIsSaving(true);
    try {
      const eventDate = values.eventDate || null;
      await updateEvent(slug, hostToken, {
        title,
        eventDate,
        eventTime: values.eventTime || null,
        location: values.location.trim() || null,
        kind: values.kind,
        adults: values.adults,
        kids: values.kids,
      });
      updateStoredEvent(slug, {title, eventDate});
      router.push(`/e/${slug}`);
    } catch (failure) {
      setFormError(rpcErrorMessage(failure as {message?: string}));
      setIsSaving(false);
    }
  }

  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>{t('title')}</h1>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <EventFields
          values={values}
          onChange={(patch) => {
            setValues((current) => ({...current, ...patch}));
            if (patch.title !== undefined && titleError) setTitleError(null);
          }}
          titleError={titleError}
        />
        <div className={styles.footer}>
          {formError && (
            <p className={styles.error} role="alert">
              {formError}
            </p>
          )}
          <Button type="submit" size="cta" isFullWidth isLoading={isSaving}>
            {t('submit')}
          </Button>
          <Button type="button" variant="secondary" isFullWidth onClick={() => router.back()}>
            {common('cancel')}
          </Button>
        </div>
      </form>
    </main>
  );
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
