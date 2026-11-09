'use client';

import {useEffect, useId, useRef, useState} from 'react';
import styles from './ActionMenu.module.css';

export type ActionMenuItem = {
  key: string;
  label: string;
  onSelect: () => void;
  /** Destructive actions (delete) are shown in ember. */
  isDanger?: boolean;
};

type ActionMenuProps = {
  /** Accessible name of the ⋮ button, e.g. 'More options for "Churrasco"'. */
  label: string;
  items: ActionMenuItem[];
};

/**
 * ⋮ button with a small menu below it. Closes on Escape, on a tap outside and after a choice;
 * arrow keys move between items (WAI-ARIA menu button pattern, kept small).
 */
export function ActionMenu({label, items}: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    itemRefs.current[0]?.focus();
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  function close({restoreFocus}: {restoreFocus: boolean}) {
    setIsOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }

  function handleMenuKeyDown(event: React.KeyboardEvent) {
    const current = itemRefs.current.findIndex((item) => item === document.activeElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      close({restoreFocus: true});
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      itemRefs.current[(current + step + items.length) % items.length]?.focus();
    } else if (event.key === 'Tab') {
      close({restoreFocus: false});
    }
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((open) => !open)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {isOpen && (
        <div id={menuId} role="menu" aria-label={label} className={styles.menu} onKeyDown={handleMenuKeyDown}>
          {items.map((item, index) => (
            <button
              key={item.key}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={item.isDanger ? `${styles.item} ${styles.danger}` : styles.item}
              onClick={() => {
                close({restoreFocus: false});
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
