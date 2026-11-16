// "Fixar na tela do celular": what the install button can do on this browser.
//
//   'prompt' → Chrome, Edge, Samsung Internet… gave us a beforeinstallprompt event: one tap installs.
//   'ios'    → iPhone/iPad: no install API; we show the Safari steps (Share → Add to Home Screen).
//   'manual' → another phone browser without the event: we show the menu steps.
//   'hidden' → already running as an installed app, already installed now, on the server, or a
//              desktop browser without the event.
//
// The event can fire before React hydrates, so the listener is registered when this module loads.

export type InstallMode = 'prompt' | 'ios' | 'manual' | 'hidden';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>;
};

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // keep the browser's own mini-infobar away; our button asks instead
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    notify();
  });
}

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & {standalone?: boolean}).standalone === true
  );
}

function isIOS() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isPhone() {
  return /Android|Mobi/i.test(navigator.userAgent);
}

export function getInstallMode(): InstallMode {
  if (installed || isStandalone()) return 'hidden';
  if (deferred) return 'prompt';
  if (isIOS()) return 'ios';
  if (isPhone()) return 'manual';
  return 'hidden';
}

export function getServerInstallMode(): InstallMode {
  return 'hidden';
}

export function subscribeToInstall(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Opens the browser's install dialog. Returns false when there is nothing to open. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  deferred = null; // an event can only be used once
  notify();
  await event.prompt();
  const choice = await event.userChoice;
  if (choice.outcome === 'accepted') installed = true;
  notify();
  return true;
}
