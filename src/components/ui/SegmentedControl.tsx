'use client';

import styles from './SegmentedControl.module.css';

type SegmentedControlProps<T extends string> = {
  label: string;
  options: readonly {value: T; label: string}[];
  value: T | null;
  onChange: (value: T) => void;
};

/** A few equal-width choices in one row ("Vou · Talvez · Não vou"). Nothing selected is allowed. */
export function SegmentedControl<T extends string>({label, options, value, onChange}: SegmentedControlProps<T>) {
  return (
    <div className={styles.group} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.option}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
