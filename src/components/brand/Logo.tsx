// QuemLeva mark: tote bag with a check (Design System, Logos). Paths match quemleva-simbolo.svg.
// The wordmark is live text in the app font, so it stays crisp and is read by screen readers.

const BAG_BODY =
  'M14 21h36a4 4 0 0 1 3.98 3.6l2.42 24.2A7 7 0 0 1 49.43 56.5H14.57a7 7 0 0 1-6.97-7.7l2.42-24.2A4 4 0 0 1 14 21z';
const HANDLE = 'M23.5 24v-4a8.5 8.5 0 0 1 17 0v4';
const CHECK = 'M22.5 38.5l6.5 6.5 12.5-13';

export function LogoSymbol({size = 28}: {size?: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d={HANDLE} fill="none" stroke="var(--brand)" strokeWidth="5" strokeLinecap="round" />
      <path d={BAG_BODY} fill="var(--brand)" />
      <path d={CHECK} fill="none" stroke="var(--on-brand)" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Horizontal logo: symbol + "quem" in ink and "leva" in brand green. */
export function Logo() {
  return (
    <span style={{display: 'inline-flex', alignItems: 'center', gap: 8}}>
      <LogoSymbol />
      <span style={{fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em'}}>
        quem<span style={{color: 'var(--brand)'}}>leva</span>
      </span>
    </span>
  );
}
