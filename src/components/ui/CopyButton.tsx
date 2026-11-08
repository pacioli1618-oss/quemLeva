'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {copyText} from '@/lib/clipboard';
import {Button} from './Button';
import styles from './CopyButton.module.css';

type CopyButtonProps = {
  text: string;
  label?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
};

/** Copies and shows "Copiado" for two seconds; says so when the browser refuses. */
export function CopyButton({text, label, variant, className}: CopyButtonProps) {
  const t = useTranslations('Share');
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function handleCopy() {
    const isCopied = await copyText(text);
    setState(isCopied ? 'copied' : 'failed');
    if (isCopied) setTimeout(() => setState('idle'), 2000);
  }

  const content = state === 'copied' ? t('copied') : (label ?? t('copy'));
  return (
    <>
      {className ? (
        <button type="button" className={className} onClick={() => void handleCopy()} disabled={!text} aria-live="polite">
          {content}
        </button>
      ) : (
        <Button variant={variant} onClick={() => void handleCopy()} disabled={!text} aria-live="polite">
          {content}
        </Button>
      )}
      {state === 'failed' && (
        <p className={styles.copyFailed} role="alert">
          {t('copyFailed')}
        </p>
      )}
    </>
  );
}
