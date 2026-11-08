/**
 * Reads a quantity typed by a person: "2", "1,5", "1.5", " 3 ". Empty means "no exact amount".
 * Returns undefined for empty input, null for invalid input, or the number (rounded to 2 decimals,
 * the database precision).
 *
 * A text field with inputMode="decimal" is used instead of type="number" because number inputs
 * reject the comma on many Brazilian and Argentinian keyboards.
 */
export function parseQuantity(input: string): number | undefined | null {
  const text = input.trim();
  if (text === '') return undefined;
  if (!/^\d+([.,]\d+)?$/.test(text)) return null;
  const value = Number(text.replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0 || value >= 100_000_000) return null;
  return Math.round(value * 100) / 100;
}

/** Stepper increment for a unit: half a kilo or litre, 100 g or ml, otherwise whole units. */
export function getQuantityStep(unit: string | null): number {
  if (unit === 'kg' || unit === 'l') return 0.5;
  if (unit === 'g' || unit === 'ml') return 100;
  return 1;
}

/**
 * What the claim stepper starts at: the current claim when editing, otherwise one step, never
 * more than what is left. 0 means nothing can be claimed.
 */
export function getInitialClaimQuantity(input: {mine: number | null; max: number; step: number}): number {
  if (input.mine !== null) return input.mine;
  return Math.min(input.max, input.step);
}
