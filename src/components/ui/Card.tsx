import type {ComponentProps} from 'react';
import styles from './Card.module.css';

type CardProps = ComponentProps<'div'> & {
  /** default = item cards and summaries; large = the create-event form panel; flush = lists that pad their own rows. */
  variant?: 'default' | 'large' | 'flush';
};

/** Surface on top of the page background. Borders, never shadows. */
export function Card({variant = 'default', className, ...rest}: CardProps) {
  const variantClass = variant === 'large' ? styles.large : variant === 'default' ? styles.padded : undefined;
  return <div className={[styles.card, variantClass, className].filter(Boolean).join(' ')} {...rest} />;
}
