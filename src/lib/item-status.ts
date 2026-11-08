import type {ItemView} from './api-mappers';

export type ItemStatus = {
  /** How much is still missing; null for open items (no quantity_needed). */
  remaining: number | null;
  /** Nothing left to bring. Open items are covered as soon as someone claims them. */
  isCovered: boolean;
  /** 0 to 1, for the progress bar. */
  progress: number;
};

/** Single rule for "what is missing", shared by every screen. */
export function getItemStatus(item: Pick<ItemView, 'quantityNeeded' | 'quantityClaimed' | 'claims'>): ItemStatus {
  if (item.quantityNeeded === null) {
    const isCovered = item.claims.length > 0;
    return {remaining: null, isCovered, progress: isCovered ? 1 : 0};
  }
  const remaining = Math.max(0, Math.round((item.quantityNeeded - item.quantityClaimed) * 100) / 100);
  return {
    remaining,
    isCovered: remaining === 0,
    progress: item.quantityNeeded > 0 ? Math.min(1, item.quantityClaimed / item.quantityNeeded) : 1,
  };
}

/** Splits a list into what is still missing and what is covered, keeping the host's order. */
export function splitItemsByStatus<T extends Pick<ItemView, 'quantityNeeded' | 'quantityClaimed' | 'claims'>>(items: T[]) {
  const missing: T[] = [];
  const covered: T[] = [];
  for (const item of items) (getItemStatus(item).isCovered ? covered : missing).push(item);
  return {missing, covered};
}
