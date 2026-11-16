'use client';

import {useTranslations} from 'next-intl';
import {useCallback, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {getInstallMode, getServerInstallMode, promptInstall, subscribeToInstall} from '@/lib/install';
import styles from './InstallButton.module.css';

/**
 * "Fixar na tela do celular" (same button in every app of the series). Chrome, Edge and Samsung
 * Internet open their install dialog; on iPhone and other phone browsers it shows the steps.
 * Hidden when the app already runs from the home screen and on desktop browsers that can't install it.
 */
export function InstallButton() {
  const t = useTranslations('Install');
  const mode = useSyncExternalStore(subscribeToInstall, getInstallMode, getServerInstallMode);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  if (mode === 'hidden') return null;

  const steps = mode === 'ios' ? [t('ios1'), t('ios2'), t('ios3')] : [t('menu1'), t('menu2')];

  return (
    <>
      <button
        type="button"
        className={styles.button}
        onClick={async () => {
          if (mode === 'prompt' && (await promptInstall())) return;
          setOpen(true);
        }}
      >
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 2.5h7a2.5 2.5 0 0 1 2.5 2.5v14a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 19V5a2.5 2.5 0 0 1 2.5-2.5ZM12 7v7M9 11l3 3 3-3M11 18.5h2" />
        </svg>
        {t('button')}
      </button>
      {open && <InstallSheet title={t('title')} intro={t('intro')} steps={steps} done={t('done')} onClose={close} />}
    </>
  );
}

function InstallSheet({title, intro, steps, done, onClose}: {title: string; intro: string; steps: string[]; done: string; onClose: () => void}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className={styles.grabber} aria-hidden="true" />
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.intro}>{intro}</p>
        <ol className={styles.steps}>
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <button type="button" className={styles.done} onClick={onClose}>
          {done}
        </button>
      </div>
    </div>
  );
}
