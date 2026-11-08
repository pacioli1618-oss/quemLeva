'use client';

import {useId, type ComponentProps} from 'react';
import styles from './TextField.module.css';

type TextFieldProps = Omit<ComponentProps<'input'>, 'id'> & {
  label: string;
  hint?: string;
  /** Translated message; also marks the input invalid for screen readers. */
  error?: string | null;
};

/** Labeled text input. The label is always visible: placeholders are examples, not labels. */
export function TextField({label, hint, error, className, ...rest}: TextFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        {...rest}
      />
      {hint && !error && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
