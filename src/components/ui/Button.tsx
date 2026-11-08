import type {ComponentProps, ReactNode} from 'react';
import {Link} from '@/i18n/navigation';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'default' | 'cta';

export type ButtonStyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isFullWidth?: boolean;
};

/** Class names for things that must look like a Button but cannot be one (external links). */
export function buttonClassName({variant = 'primary', size = 'default', isFullWidth}: ButtonStyleProps, extra?: string) {
  return [styles.button, styles[variant], size === 'cta' && styles.cta, isFullWidth && styles.fullWidth, extra]
    .filter(Boolean)
    .join(' ');
}

type ButtonProps = ButtonStyleProps &
  ComponentProps<'button'> & {
    /** Shows a spinner, disables the button and marks it busy for screen readers. */
    isLoading?: boolean;
    children: ReactNode;
  };

/** Main action control. One `primary` per screen; `size="cta"` for the fixed footer action. */
export function Button({variant, size, isFullWidth, isLoading, disabled, className, children, type, ...rest}: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={buttonClassName({variant, size, isFullWidth}, className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading && <span className={styles.spinner} aria-hidden="true" />}
      {children}
    </button>
  );
}

type ButtonLinkProps = ButtonStyleProps & ComponentProps<typeof Link>;

/** Same look as Button for navigation ("Continuar: montar a lista", "Eu levo"). */
export function ButtonLink({variant, size, isFullWidth, className, ...rest}: ButtonLinkProps) {
  return <Link className={buttonClassName({variant, size, isFullWidth}, className)} {...rest} />;
}
