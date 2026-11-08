import {useTranslations} from 'next-intl';
import {useFormatAmount} from './units';

// ql_* RPCs raise errors whose message is a fixed code (docs/conventions.md, section 5).
// Messages → Errors uses the same codes as keys.
export const rpcErrorCodes = [
  'event_not_found',
  'not_authorized',
  'not_joined',
  'item_not_found',
  'participant_not_found',
  'quantity_exceeds_remaining',
] as const;
export type RpcErrorCode = (typeof rpcErrorCodes)[number];

type RpcError = {message?: string; details?: string | null} | null | undefined;

export function getRpcErrorCode(error: RpcError): RpcErrorCode | 'network' | 'unknown' {
  if (!error) return 'unknown';
  const code = error.message?.trim();
  if ((rpcErrorCodes as readonly string[]).includes(code ?? '')) return code as RpcErrorCode;
  if (code && /fetch|network|failed to fetch/i.test(code)) return 'network';
  return 'unknown';
}

/**
 * Turns an RPC error into a message for the person.
 * For quantity_exceeds_remaining, DETAIL holds how much is still missing (e.g. "1.00");
 * pass the item's unit so the sentence is complete: "Só falta 1 kg desse item."
 */
export function useRpcErrorMessage() {
  const t = useTranslations('Errors');
  const formatAmount = useFormatAmount();

  return (error: RpcError, unit?: string | null) => {
    const code = getRpcErrorCode(error);
    if (code === 'quantity_exceeds_remaining') {
      const remaining = Number(error?.details ?? 0);
      return t('quantity_exceeds_remaining', {count: remaining, amount: formatAmount(remaining, unit)});
    }
    return t(code);
  };
}
