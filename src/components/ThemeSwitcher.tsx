'use client';

import {useSyncExternalStore, type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {readThemeChoice, writeThemeChoice} from '@/lib/device-store';
import {applyThemeChoice, nextThemeChoice, subscribeToThemeChoice, type ThemeChoice} from '@/lib/theme';

const icons: Record<ThemeChoice, ReactNode> = {
  // Half-filled circle: follows the device.
  auto: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
    </>
  ),
  light: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </>
  ),
  dark: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
};

// Server render and first client render show "auto"; the stored choice shows right after hydration.
const serverChoice = (): ThemeChoice => 'auto';

/** Header button that cycles the theme: automatic (device) → light → dark. */
export function ThemeSwitcher() {
  const t = useTranslations('ThemeSwitcher');
  const choice = useSyncExternalStore(subscribeToThemeChoice, readThemeChoice, serverChoice);
  const label = t('label', {choice});

  return (
    <button
      type="button"
      style={{
        width: 36,
        height: 36,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-control)',
        background: 'var(--card)',
        color: 'var(--ink-soft)',
        cursor: 'pointer',
      }}
      aria-label={label}
      title={label}
      onClick={() => {
        writeThemeChoice(nextThemeChoice(choice));
        applyThemeChoice();
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {icons[choice]}
      </svg>
    </button>
  );
}
