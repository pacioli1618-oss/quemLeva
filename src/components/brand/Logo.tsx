// QuemLeva mark: a raised hand with a check, the "eu levo!" of the family group (Design System,
// Logos). Same geometry as app/icon.svg and the PWA icons in public/icons/.
// The wordmark is live text in the app font, so it stays crisp and is read by screen readers.

/** Fingers, index to little finger: [x, y, width, height]. */
const FINGERS = [
  [19, 13, 7, 26],
  [27.5, 7, 7, 30],
  [36, 9, 7, 28],
  [44.5, 15, 6.5, 23],
] as const;
const PALM = 'M19 31h32v12.5A13.5 13.5 0 0 1 37.5 57h-5A13.5 13.5 0 0 1 19 43.5z';
const CHECK = 'M27 43l5 5 10-10.5';

export function LogoSymbol({size = 28}: {size?: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <g fill="var(--brand)">
        {FINGERS.map(([x, y, width, height]) => (
          <rect key={x} x={x} y={y} width={width} height={height} rx={width / 2} />
        ))}
        <path d={PALM} />
        {/* Thumb: a finger tilted out from the base of the palm. */}
        <rect x="19" y="26" width="7" height="18" rx="3.5" transform="rotate(-32 22.5 44)" />
      </g>
      <path d={CHECK} fill="none" stroke="var(--on-brand)" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
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
