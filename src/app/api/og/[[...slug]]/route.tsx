// Link-preview image (1200×630).
//   /api/og/<slug>        the event's card, in the event's language
//   /api/og?locale=es     the app's card (home page, or an event that no longer exists)
// Lives under /api so the locale proxy leaves it alone (see src/proxy.ts).

import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {ImageResponse} from 'next/og';
import {getFormatter, getTranslations} from 'next-intl/server';
import {defaultLocale, locales, type Locale} from '@/i18n/locales';
import {formatEventDate} from '@/i18n/format-event-date';
import {getEventPreview} from '@/lib/event-preview';

// Design System tokens (light theme).
const color = {
  brand: '#1E7A4C',
  brandStrong: '#155C39',
  brandTint: '#E4F1E9',
  surface: '#F5F6F3',
  ink: '#18201A',
  inkMuted: '#556058',
  onBrand: '#FFFFFF',
};

// Same geometry as LogoSymbol (src/components/brand/Logo.tsx).
const FINGERS = [
  [19, 13, 7, 26],
  [27.5, 7, 7, 30],
  [36, 9, 7, 28],
  [44.5, 15, 6.5, 23],
] as const;

function HandSymbol({size, fill, check}: {size: number; fill: string; check: string}) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      {FINGERS.map(([x, y, w, h]) => (
        <rect key={x} x={x} y={y} width={w} height={h} rx={w / 2} fill={fill} />
      ))}
      <path d="M19 31h32v12.5A13.5 13.5 0 0 1 37.5 57h-5A13.5 13.5 0 0 1 19 43.5z" fill={fill} />
      <rect x="19" y="26" width="7" height="18" rx="3.5" transform="rotate(-32 22.5 44)" fill={fill} />
      <path d="M27 43l5 5 10-10.5" fill="none" stroke={check} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

let fontsPromise: Promise<{name: string; data: Buffer; weight: 600 | 800}[]> | undefined;
function loadFonts() {
  fontsPromise ??= Promise.all(
    (['SemiBold', 'ExtraBold'] as const).map(async (style) => ({
      name: 'Jakarta',
      data: await readFile(join(process.cwd(), `assets/fonts/PlusJakartaSans-${style}.ttf`)),
      weight: style === 'SemiBold' ? (600 as const) : (800 as const),
    })),
  );
  return fontsPromise;
}

function titleSize(title: string) {
  if (title.length <= 24) return 92;
  if (title.length <= 44) return 76;
  return 60;
}

type Card = {chip?: string; title: string; lines: string[]; cta: string};

function render(card: Card) {
  return (
    <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: color.surface, fontFamily: 'Jakarta'}}>
      <div style={{display: 'flex', flexDirection: 'column', flexGrow: 1, padding: '56px 72px 0'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
          <HandSymbol size={60} fill={color.brand} check={color.onBrand} />
          <div style={{display: 'flex', fontSize: 42, fontWeight: 800, letterSpacing: -1}}>
            <span style={{color: color.ink}}>quem</span>
            <span style={{color: color.brand}}>leva</span>
          </div>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1, paddingBottom: 24}}>
          {card.chip ? (
            <div style={{display: 'flex', marginBottom: 20}}>
              <div style={{background: color.brandTint, color: color.brandStrong, fontSize: 28, fontWeight: 600, padding: '8px 24px', borderRadius: 999}}>
                {card.chip}
              </div>
            </div>
          ) : null}
          <div
            style={{
              fontSize: titleSize(card.title),
              fontWeight: 800,
              color: color.ink,
              letterSpacing: -2,
              lineHeight: 1.04,
              display: 'block',
              lineClamp: 2,
            }}
          >
            {card.title}
          </div>
          {card.lines.map((line) => (
            <div key={line} style={{display: 'block', lineClamp: 2, lineHeight: 1.3, fontSize: 34, fontWeight: 600, color: color.inkMuted, marginTop: 18}}>
              {line}
            </div>
          ))}
        </div>
      </div>

      <div style={{display: 'flex', alignItems: 'center', gap: 18, background: color.brand, color: color.onBrand, padding: '0 72px', height: 104, fontSize: 34, fontWeight: 600}}>
        <HandSymbol size={48} fill={color.onBrand} check={color.brand} />
        {card.cta}
      </div>
    </div>
  );
}

function pickLocale(value: string | null): Locale {
  return (locales as readonly string[]).includes(value ?? '') ? (value as Locale) : defaultLocale;
}

async function appCard(locale: Locale): Promise<Card> {
  const t = await getTranslations({locale, namespace: 'CreateEvent'});
  const common = await getTranslations({locale, namespace: 'Common'});
  return {title: t('headline'), lines: [t('intro')], cta: common('tagline')};
}

export async function GET(request: Request, {params}: RouteContext<'/api/og/[[...slug]]'>) {
  const {slug: segments} = await params;
  const slug = segments?.[0];
  const preview = slug ? await getEventPreview(slug) : null;

  let card: Card;
  if (preview) {
    const {locale} = preview;
    const t = await getTranslations({locale, namespace: 'Preview'});
    const kinds = await getTranslations({locale, namespace: 'EventKind'});
    const format = await getFormatter({locale});
    const when = formatEventDate(format, preview.eventDate, preview.eventTime, 'long');
    card = {
      chip: preview.kind === 'other' ? undefined : kinds(preview.kind),
      title: preview.title,
      lines: [when, preview.location ?? ''].filter(Boolean),
      cta: t('cta'),
    };
  } else {
    card = await appCard(pickLocale(new URL(request.url).searchParams.get('locale')));
  }

  return new ImageResponse(render(card), {
    width: 1200,
    height: 630,
    fonts: await loadFonts(),
    headers: {
      // An event that was renamed shows the new name within a few minutes, at most an hour.
      'Cache-Control': preview ? 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' : 'public, max-age=86400',
    },
  });
}
