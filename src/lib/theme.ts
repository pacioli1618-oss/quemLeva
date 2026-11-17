// Light/dark theme. "auto" follows the device; "light" and "dark" override it on this device.
//
// The choice has its own localStorage key, outside the device store, because themeScript reads it
// before the first paint (no flash of the wrong theme), long before any app code loads.
// Reads and writes from components go through src/lib/device-store.ts.
//
// The resolved theme lands on <html data-theme="light|dark">; globals.css switches tokens on it.

export const themeChoices = ['auto', 'light', 'dark'] as const;
export type ThemeChoice = (typeof themeChoices)[number];

export const THEME_STORAGE_KEY = 'quemleva:theme';

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return themeChoices.includes(value as ThemeChoice);
}

/** Auto → light → dark → auto: the order of the header button. */
export function nextThemeChoice(choice: ThemeChoice): ThemeChoice {
  return themeChoices[(themeChoices.indexOf(choice) + 1) % themeChoices.length];
}

const CHANGE_EVENT = 'themechoicechange';

/** Re-applies the theme after the choice changed in this tab, and tells the switchers. */
export function applyThemeChoice() {
  (window as Window & {__applyTheme?: () => void}).__applyTheme?.();
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** For useSyncExternalStore: changes from this tab and from other tabs. */
export function subscribeToThemeChoice(listener: () => void) {
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

// Inline in <head> (app/[locale]/layout.tsx), so it runs before the page paints. Plain ES5 on purpose.
// It also keeps up with the device setting while the page is open, with other tabs, and points the
// browser-bar color (<meta name="theme-color" media=...>) at the chosen theme.
export const themeScript = `(function () {
  var root = document.documentElement;
  var dark = window.matchMedia('(prefers-color-scheme: dark)');
  function choice() {
    try {
      var value = window.localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
      if (value === 'light' || value === 'dark') return value;
    } catch (e) {}
    return 'auto';
  }
  function apply() {
    var picked = choice();
    var theme = picked === 'auto' ? (dark.matches ? 'dark' : 'light') : picked;
    root.setAttribute('data-theme', theme);
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) {
      var meta = metas[i];
      var media = meta.getAttribute('data-media');
      if (media === null) {
        media = meta.getAttribute('media') || '';
        meta.setAttribute('data-media', media);
      }
      meta.setAttribute('media', picked === 'auto' ? media : media.indexOf(theme) >= 0 ? 'all' : 'not all');
    }
  }
  window.__applyTheme = apply;
  apply();
  if (dark.addEventListener) dark.addEventListener('change', apply);
  else if (dark.addListener) dark.addListener(apply);
  window.addEventListener('storage', apply);
  document.addEventListener('DOMContentLoaded', apply);
})();`;
