# Naming conventions

English is the base language of the codebase. Everything a developer reads or types is in English: identifiers, files, folders, routes, database objects, error codes, commits, code comments and developer docs. Only **user-facing text** is translated, and it lives in `messages/<locale>.json`, never in code.

## 1. Domain glossary

One concept, one word, everywhere: database, TypeScript, i18n keys and docs. When a pt-BR UI word has no listed term, add it here before using it.

| pt-BR (UI) | Code term | Examples |
| --- | --- | --- |
| Evento | `event` | `quemleva.events`, `EventView`, `useEvent()` |
| Organizador | `host` | `host_tokens`, `hostToken`, `role: 'host'`, `invited_by_host` |
| Link de organizador | `host token` | `p_host_token`, `/e/[slug]/manage#<hostToken>` |
| Participante, convidado | `participant` | `participants`, `participantId`. "Guest" appears only in UI copy. |
| Acompanhante | `plus-one` | `plus_ones`, `plusOnes`, `Rsvp.plusOnes` |
| Item da lista | `item` | `items`, `ItemView` |
| "Eu levo" | `claim` | `claims`, `ql_set_claim`, `ClaimSheet` |
| Quantidade | `quantity` | `quantity_needed`, `quantity_claimed`, `quantity_remaining` |
| Presença | `rsvp` | `rsvp: 'yes' \| 'no' \| 'maybe'`, `rsvp_at` |
| Convite nominal | `invite` | `invite_token`, `ql_open_invite` |
| Gasto | `expense` | `amount_spent`, `ExpensesPage` |
| Tipo de evento | `kind` | `events.kind`, `EventKind.barbecue` |
| Unidade / Categoria | `unit` / `category` | `unit: 'bag'`, `category: 'meat'` |
| Meus eventos | `my events` | `/my-events`, `listMyEvents()` |
| Aparelho | `device` | `deviceId`, `device-store.ts` |
| Calculadora de churrasco | `barbecue calculator` | `barbecue-calculator.ts` |
| Parceiro | `partner` | `partners`, `partner_clicks` |
| Laranja-brasa (cor) | `ember` | `--ember`, `ember-strong` |

## 2. Abbreviations

Write words out in full: `quantity`, not `qty`; `event`, not `evt`; `participant`, not `part`.

These are the only allowed abbreviations: `id`, `url`, `api`, `db`, `rsvp`, `i18n`, `ui`, `pwa`, `og` (Open Graph), plus the SQL prefixes in section 4.

## 3. TypeScript and React

| Thing | Style | Example |
| --- | --- | --- |
| React component file | `PascalCase.tsx` | `LocaleSwitcher.tsx`, `ItemCard.tsx` |
| Any other module | `kebab-case.ts` | `device-store.ts`, `use-event.ts` |
| Component, type, interface | `PascalCase`, no `I` prefix | `ItemCard`, `EventView`, `StoredEvent` |
| Function, variable | `camelCase`, verb first for functions | `createEvent()`, `formatAmount()` |
| Hook | `useCamelCase`, file `use-kebab.ts` | `useEvent()` in `use-event.ts` |
| Boolean | `is`, `has`, `can` or `should` prefix | `isHost`, `hasClaims` |
| Event handler | `handleX` inside, `onX` as a prop | `onClaim={handleClaim}` |
| Module-level constant | `SCREAMING_SNAKE_CASE` for fixed scalars | `STORAGE_KEY`, `DEBOUNCE_MS` |
| Readonly list of codes | `camelCase` plural, with a singular type | `unitCodes` / `UnitCode` |
| Next.js special files | the framework's names | `page.tsx`, `layout.tsx`, `proxy.ts` |
| Test file | `tests/<module>.test.ts`; fixtures in `tests/fixtures/`, named after the RPC | `tests/api-mappers.test.ts`, `ql_get_event.json` |

**Database ↔ TypeScript boundary:** the database speaks `snake_case` and TypeScript speaks `camelCase`. The conversion happens only in `src/lib/api.ts` and `src/lib/api-mappers.ts`. Components never see `p_` parameters or snake_case fields.

## 4. Database (Postgres / Supabase)

| Thing | Style | Example |
| --- | --- | --- |
| Schema | app name | `quemleva` |
| Table | `snake_case`, plural noun | `events`, `host_tokens`, `claims` |
| Column | `snake_case`, singular | `quantity_needed`, `plus_ones` |
| Primary key | `id uuid` | |
| Foreign key | `<singular table>_id` | `event_id`, `participant_id` |
| Timestamp | `<verb>_at` (`timestamptz`) | `created_at`, `revoked_at`, `rsvp_at` |
| Date-only, time-only | `<noun>_date`, `<noun>_time` | `event_date`, `event_time` |
| Boolean | `is_` / `has_`, or a past participle | `invited_by_host` |
| Code-valued text | `text` + `check (... in (...))`, English codes | `kind in ('barbecue', ...)` |
| Public RPC | `ql_<verb>_<noun>` in `public` | `ql_create_event`, `ql_set_claim`, `ql_get_event_as_host` |
| Internal helper | `<verb>_<noun>` in `quemleva` | `require_event`, `require_host_event`, `random_text` |
| Function parameter | `p_` + `snake_case` | `p_slug`, `p_host_token` |
| PL/pgSQL local variable | `v_` + `snake_case` | `v_slug`, `v_others` |
| Trigger | `<table>_<action>` | `claims_notify` |
| Index | `<table>_<columns>_idx` | `items_event_sort_idx` |
| Migration file | `<YYYYMMDDHHMMSS>_<snake_case_summary>.sql` | `20261108000300_naming_conventions.sql` |

Columns repeat the table name only when the bare word is a SQL type or keyword: `event_date`, not `date`.

**RPC verbs:** use `get`, `create`, `update`, `upsert`, `add` (in bulk), `delete` (a row), `remove` (a person from an event), `set` (replace a value that belongs to the caller), `join`, `open`, `invite`.

## 5. Error codes

Errors raised by RPCs carry a fixed English code as the message, in `snake_case`: `<subject>_<problem>` (`event_not_found`, `quantity_exceeds_remaining`) or a generic state (`not_authorized`, `not_joined`). Extra data goes in `DETAIL` (`event_suspended` has none; `quantity_exceeds_remaining` → what is still missing; `rate_limited` → `hour` or `day`). The `Errors` namespace in `messages/*.json` uses the **same codes as keys**. This is the one place where i18n keys are `snake_case`.

## 6. Realtime

Channel topic: `<entity>:<key>`, as in `event:<slug>`. Broadcast event names are past-tense verbs: `changed`.

## 7. Routes and URLs

Paths are short, lowercase, kebab-case English. They never include the locale (see `docs/i18n.md`). Secrets go in the URL fragment (`#…`) so they never reach the server or its logs.

| Route | Screen |
| --- | --- |
| `/` | Create event |
| `/e/[slug]` | Join the event (no name on this device yet), then the event list |
| `/e/[slug]/claim/[itemId]` | "Eu levo": claim part of an item |
| `/e/[slug]/items` | Build the list (host) |
| `/e/[slug]/guests` | "Quem vai" (participants) / Guests with invites (host) |
| `/e/[slug]/expenses` | Expenses (host): who spent what, Spliit group link |
| `/e/[slug]/share` | Share |
| `/e/[slug]/edit` | Edit the event's details (host), from the ⋮ menu in My events |
| `/e/[slug]/print/items`, `/e/[slug]/print/guests` | A4 print versions |
| `/e/[slug]/invite/[inviteToken]` | Personal invite |
| `/e/[slug]/manage#<hostToken>` | Host link: stores the token on the device, then opens the event |
| `/my-events` | My events |
| `/about`, `/privacy`, `/terms` | About (incl. how to tell a real link from a scam), privacy policy, terms. Operator and contact in `src/lib/site.ts`. |
| `/api/og/[slug]`, `/api/og?locale=` | Link-preview image (event card, or the app's card). Under `/api` so the locale proxy skips it. |

Link previews: `app/[locale]/e/[slug]/layout.tsx` sets the og/twitter tags for every page of an event,
in the **event's** language (`events.locale`), since crawlers send no cookie. Event pages are `noindex`.

## 8. i18n messages

- **Namespaces** are `PascalCase`, one per screen or shared area: `CreateEvent`, `EventList`, `Common`, `Units`.
- **Keys** are `camelCase`, named for meaning, not wording: `missingItems`, not `itensFaltando`.
- **Code-valued keys** match the stored code exactly: `Units.bag`, `EventKind.barbecue`, `Errors.event_not_found`.
- `pt-BR` is the source file; `npm run i18n:check` enforces the rest.

## 9. CSS and design tokens

- **Tokens:** custom properties use the Design System token names, in `kebab-case` English: `--surface`, `--brand-strong`, `--ember`, `--radius-md`. They are all declared in `src/app/globals.css`, kept in sync with the Design System.
- **Styling:** CSS Modules, one `Component.module.css` next to `Component.tsx`. Class names are `camelCase` (`styles.fullWidth`).
- **Colors and sizes** come only from tokens (`var(--…)`). No hex values or magic radii inside components.
- **Borders, not shadows.**

## 10. Folders

| Folder | What goes there |
| --- | --- |
| `src/app/[locale]/` | Routes (pages, layouts). Page-only components sit next to their `page.tsx`. |
| `src/components/brand/` | Logo and other brand marks |
| `src/components/ui/` | Design System primitives with no domain knowledge: `Button`, `TextField`, `SelectField`, `Stepper`, `Chip`, `Tag`, `ProgressBar`, `Card` |
| `src/components/event/` | Components that know the domain: `ItemCard`, `CoveredItemList`, `TabBar` |
| `src/hooks/` | React hooks shared across screens: `use-event.ts`, `use-stored-event.ts`, `use-origin.ts` |
| `src/lib/` | Framework-free logic and the database door: `api.ts`, `api-mappers.ts`, `event-sync.ts`, `item-status.ts`, `quantity.ts`, `share-links.ts`, `clipboard.ts`, `tabs.ts`, `device-store.ts` |
| `src/i18n/` | Locales, routing, formatting helpers |
| `src/app/[locale]/dev/` | Development-only pages (404 in production): `/dev/ui` |

## 11. Environment variables

`SCREAMING_SNAKE_CASE`. The `NEXT_PUBLIC_` prefix only for values that are safe in the browser: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Server secrets have no prefix: `SUPABASE_SECRET_KEY`.

## 12. Git

- **Branches:** `<type>/<kebab-summary>`, as in `feat/claim-sheet` or `fix/rsvp-plus-ones`.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org) in English, imperative mood, as in `feat(claim): block quantities above what is missing`. Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `db` (migrations), `i18n`.

## 13. Comments and docs

- **Code comments** are in English and explain *why*, not *what*.
- **Developer docs** (`README.md`, `docs/`) are in English.
- **Product and business documents** for the team, outside the repository, may stay in pt-BR.
