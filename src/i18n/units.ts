import {useFormatter, useTranslations} from 'next-intl';

// Known units. items.unit stores the code (e.g. "kg", "bag"); the translated, correctly
// pluralized label comes from messages/<locale>.json → Units.
// Free text that is not a code (e.g. "travessa") is shown as typed.
export const unitCodes = ['un', 'kg', 'g', 'l', 'ml', 'pack', 'bag', 'box', 'bottle', 'can', 'dozen', 'portion'] as const;
export type UnitCode = (typeof unitCodes)[number];

export function isUnitCode(value: string | null | undefined): value is UnitCode {
  return !!value && (unitCodes as readonly string[]).includes(value);
}

export const categoryCodes = ['meat', 'drinks', 'sides', 'desserts', 'supplies', 'other'] as const;
export type CategoryCode = (typeof categoryCodes)[number];

export function isCategoryCode(value: string | null | undefined): value is CategoryCode {
  return !!value && (categoryCodes as readonly string[]).includes(value);
}

/**
 * Formats quantity + unit in the current locale: "1,5 kg", "4 sacos", "4 bolsas", "2 bottles".
 * Works in Server and Client Components.
 */
export function useFormatAmount() {
  const t = useTranslations('Units');
  const format = useFormatter();

  return (quantity: number, unit?: string | null) => {
    const formatted = format.number(quantity, {maximumFractionDigits: 2});
    if (!unit) return formatted;
    const label = isUnitCode(unit) ? t(unit, {count: quantity}) : unit;
    return `${formatted} ${label}`;
  };
}

/** Translated category label; free text is returned as is. */
export function useCategoryLabel() {
  const t = useTranslations('Categories');
  return (category?: string | null) => (isCategoryCode(category) ? t(category) : (category ?? ''));
}
