'use client';

import {useTranslations} from 'next-intl';
import {useMyEvents} from '@/hooks/use-my-events';
import {Link} from '@/i18n/navigation';

/** Home shortcut to /my-events; hidden until this device has at least one event. */
export function MyEventsLink({className}: {className?: string}) {
  const t = useTranslations('MyEvents');
  const events = useMyEvents();
  const count = events ? Object.keys(events).length : 0;
  if (count === 0) return null;
  return (
    <Link href="/my-events" className={className}>
      <span>
        {t('link')} · {count}
      </span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
