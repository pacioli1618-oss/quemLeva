'use client';

import {useLocale, useTranslations} from 'next-intl';
import {useTransition} from 'react';
import {usePathname, useRouter} from '@/i18n/navigation';
import {isLocale, localeNames, locales} from '@/i18n/locales';

// Switches the locale without changing the URL: sets the QL_LOCALE cookie and reloads the route.
export default function LocaleSwitcher() {
  const t = useTranslations('LocaleSwitcher');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <label style={{display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-soft)'}}>
      <span>{t('label')}</span>
      <select
        value={locale}
        disabled={isPending}
        onChange={(event) => {
          const next = event.target.value;
          if (!isLocale(next)) return;
          startTransition(() => {
            router.replace(pathname, {locale: next});
          });
        }}
        style={{
          height: 36,
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-control)',
          background: 'var(--card)',
          color: 'var(--ink)',
          font: 'inherit',
          padding: '0 8px',
        }}
      >
        {locales.map((value) => (
          <option key={value} value={value}>
            {localeNames[value]}
          </option>
        ))}
      </select>
    </label>
  );
}
