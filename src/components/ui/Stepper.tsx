'use client';

import {useId} from 'react';
import styles from './Stepper.module.css';

type StepperProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** Translated accessible names for the − and + buttons ("Menos adultos"). */
  decreaseLabel: string;
  increaseLabel: string;
  min?: number;
  max?: number;
  step?: number;
  /** Formats the shown value, e.g. "1,5 kg". Defaults to the number. */
  formatValue?: (value: number) => string;
};

/** Number input with − and + buttons sized for thumbs. */
export function Stepper({
  label,
  value,
  onChange,
  decreaseLabel,
  increaseLabel,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  formatValue = String,
}: StepperProps) {
  const labelId = useId();
  // Round to avoid 0.1 + 0.2 artifacts when stepping by fractions (0.5 kg).
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next * 100) / 100));

  return (
    <div className={styles.stepper} role="group" aria-labelledby={labelId}>
      <span id={labelId} className={styles.label}>
        {label}
      </span>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.step}
          aria-label={decreaseLabel}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - step))}
        >
          −
        </button>
        <output className={styles.value} aria-live="polite">
          {formatValue(value)}
        </output>
        <button
          type="button"
          className={styles.step}
          aria-label={increaseLabel}
          disabled={value >= max}
          onClick={() => onChange(clamp(value + step))}
        >
          +
        </button>
      </div>
    </div>
  );
}
