'use client';

import type {ReactNode} from 'react';
import styles from './Chip.module.css';

type ChipProps = {
  isSelected: boolean;
  onClick: () => void;
  children: ReactNode;
};

/** Toggle button shaped as a pill (event kind, category filters). */
export function Chip({isSelected, onClick, children}: ChipProps) {
  return (
    <button type="button" className={styles.chip} aria-pressed={isSelected} onClick={onClick}>
      {children}
    </button>
  );
}

type ChipGroupProps<T extends string> = {
  label: string;
  options: readonly {value: T; label: string}[];
  value: T;
  onChange: (value: T) => void;
};

/** Single choice among a few options, e.g. "Churrasco · Almoço · Aniversário · Outro". */
export function ChipGroup<T extends string>({label, options, value, onChange}: ChipGroupProps<T>) {
  return (
    <div className={styles.group} role="group" aria-label={label}>
      {options.map((option) => (
        <Chip key={option.value} isSelected={option.value === value} onClick={() => onChange(option.value)}>
          {option.label}
        </Chip>
      ))}
    </div>
  );
}
