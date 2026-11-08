'use client';

import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {Link, usePathname} from '@/i18n/navigation';
import {getActiveTab, getEventTabs, type TabKey} from '@/lib/tabs';
import styles from './TabBar.module.css';

type TabBarProps = {
  slug: string;
  /** Known by the page once it has the event (host token on this device). */
  isHost: boolean;
  /** Overrides the tab derived from the URL (showcase, previews). */
  activeTab?: TabKey | null;
};

/** Footer menu of an event: Eventos · Lista · Convidados/Quem vai · Gastos (host) · Compartilhar. */
export function TabBar({slug, isHost, activeTab}: TabBarProps) {
  const t = useTranslations('Nav');
  const pathname = usePathname();
  const active = activeTab === undefined ? getActiveTab(pathname) : activeTab;

  const labels: Record<TabKey, string> = {
    events: t('events'),
    list: t('list'),
    guests: isHost ? t('guests') : t('whoIsGoing'),
    expenses: t('expenses'),
    share: t('share'),
  };

  return (
    <nav className={styles.bar} aria-label={t('label')}>
      {getEventTabs(slug, isHost).map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={styles.tab}
          aria-current={tab.key === active ? 'page' : undefined}
        >
          <span className={styles.icon}>{icons[tab.key]}</span>
          {labels[tab.key]}
        </Link>
      ))}
    </nav>
  );
}

// Stroke icons, 24px grid, 2px stroke (Design System, Iconography).
const iconProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

const icons: Record<TabKey, ReactNode> = {
  events: (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  list: (
    <svg {...iconProps}>
      <path d="M10 6h10M10 12h10M10 18h10" />
      <path d="M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 11M3.5 18l1.5 1.5L7.5 17" />
    </svg>
  ),
  guests: (
    <svg {...iconProps}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" />
    </svg>
  ),
  expenses: (
    <svg {...iconProps}>
      <path d="M12 3v18" />
      <path d="M17 7H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H7" />
    </svg>
  ),
  share: (
    <svg {...iconProps}>
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M16 6l-4-4-4 4" />
      <path d="M12 2v13" />
    </svg>
  ),
};
