'use client';

import {useId, type ComponentProps} from 'react';
import styles from './TextField.module.css';

type SelectFieldProps = Omit<ComponentProps<'select'>, 'id'> & {
  label: string;
  options: readonly {value: string; label: string}[];
};

/** Labeled native select: the phone's own picker is the most familiar control there is. */
export function SelectField({label, options, className, ...rest}: SelectFieldProps) {
  const id = useId();
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <select id={id} className={styles.input} {...rest}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
