import type {Locale} from '@/i18n/locales';
import type messages from '../../messages/pt-BR.json';

// Strict typing: unknown keys and missing arguments fail the build.
// pt-BR is the source; es and en are checked by `npm run i18n:check`.
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
