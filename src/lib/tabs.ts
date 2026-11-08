// Footer tabs of an event: which ones each role sees and which one a path belongs to.
// Framework-free so the rules are unit-tested; rendered by src/components/event/TabBar.tsx.

export type TabKey = 'events' | 'list' | 'guests' | 'expenses' | 'share';

export type Tab = {key: TabKey; href: string};

/** Host: 5 tabs. Participant: no Expenses (docs: mockup TabBar, "perfil participante"). */
export function getEventTabs(slug: string, isHost: boolean): Tab[] {
  const base = `/e/${encodeURIComponent(slug)}`;
  const tabs: Tab[] = [
    {key: 'events', href: '/my-events'},
    {key: 'list', href: base},
    {key: 'guests', href: `${base}/guests`},
    {key: 'expenses', href: `${base}/expenses`},
    {key: 'share', href: `${base}/share`},
  ];
  return isHost ? tabs : tabs.filter((tab) => tab.key !== 'expenses');
}

/** The tab a path belongs to (path without locale, as next-intl's usePathname returns it). */
export function getActiveTab(pathname: string): TabKey | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/my-events') return 'events';
  const match = /^\/e\/[^/]+(\/[^/]+)?/.exec(path);
  if (!match) return null;
  switch (match[1]) {
    case undefined:
      return 'list';
    case '/guests':
      return 'guests';
    case '/expenses':
      return 'expenses';
    case '/share':
      return 'share';
    default:
      return null; // invite, manage, print… have no tab of their own
  }
}
