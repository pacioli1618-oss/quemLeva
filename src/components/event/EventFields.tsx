'use client';

import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {Card} from '@/components/ui/Card';
import {ChipGroup} from '@/components/ui/Chip';
import {Stepper} from '@/components/ui/Stepper';
import {TextField} from '@/components/ui/TextField';
import type {EventKind} from '@/lib/api';
import styles from './EventFields.module.css';

export const EVENT_KINDS: readonly EventKind[] = ['barbecue', 'lunch', 'birthday', 'christmas', 'other'];

export type EventFieldValues = {
  title: string;
  eventDate: string;
  eventTime: string;
  location: string;
  kind: EventKind;
  adults: number;
  kids: number;
};

type EventFieldsProps = {
  values: EventFieldValues;
  onChange: (patch: Partial<EventFieldValues>) => void;
  titleError?: string | null;
  /** Extra fields after the place (the host's name, when creating). */
  afterLocation?: ReactNode;
};

/** The event's own fields, shared by Create event (screen 1) and Edit event. */
export function EventFields({values, onChange, titleError, afterLocation}: EventFieldsProps) {
  const t = useTranslations('CreateEvent');
  const kinds = useTranslations('EventKind');

  return (
    <Card variant="large" className={styles.fields}>
      <TextField
        label={t('name')}
        placeholder={t('namePlaceholder')}
        value={values.title}
        onChange={(event) => onChange({title: event.target.value})}
        maxLength={120}
        autoComplete="off"
        error={titleError}
        required
      />
      <div className={styles.row}>
        <TextField label={t('date')} type="date" value={values.eventDate} onChange={(event) => onChange({eventDate: event.target.value})} />
        <TextField label={t('time')} type="time" value={values.eventTime} onChange={(event) => onChange({eventTime: event.target.value})} />
      </div>
      <TextField
        label={`${t('location')} (${t('optional')})`}
        placeholder={t('locationPlaceholder')}
        value={values.location}
        onChange={(event) => onChange({location: event.target.value})}
        maxLength={200}
      />
      {afterLocation}
      <div className={styles.kind}>
        <span className={styles.groupLabel}>{t('kind')}</span>
        <ChipGroup
          label={t('kind')}
          value={values.kind}
          onChange={(kind) => onChange({kind})}
          options={EVENT_KINDS.map((value) => ({value, label: kinds(value)}))}
        />
      </div>
      <div className={styles.people}>
        <Stepper
          label={t('adults')}
          value={values.adults}
          onChange={(adults) => onChange({adults})}
          max={1000}
          decreaseLabel={t('decreaseAdults')}
          increaseLabel={t('increaseAdults')}
        />
        <Stepper
          label={t('kids')}
          value={values.kids}
          onChange={(kids) => onChange({kids})}
          max={1000}
          decreaseLabel={t('decreaseKids')}
          increaseLabel={t('increaseKids')}
        />
      </div>
    </Card>
  );
}
