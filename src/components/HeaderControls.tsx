import LocaleSwitcher from '@/components/LocaleSwitcher';
import {ThemeSwitcher} from '@/components/ThemeSwitcher';

/** Theme and language switchers, on the right of the screen header. */
export function HeaderControls() {
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0}}>
      <ThemeSwitcher />
      <LocaleSwitcher />
    </div>
  );
}
