# QuemLeva

A sign-up-free web app to sort out **who brings what** to family events. Licensed under AGPL-3.0.

- Next.js 16 (App Router, `cacheComponents`) + Supabase (Postgres, `ql_*` RPCs, Realtime broadcast)
- Languages: pt-BR, es, en. See [docs/i18n.md](docs/i18n.md).
- Naming and code style: [docs/conventions.md](docs/conventions.md). **Read it before contributing.**
- What is deliberately left for after the MVP: [docs/improvements.md](docs/improvements.md).
- Everything the app stores on the device goes through `src/lib/device-store.ts`.

## Running

```bash
cp .env.example .env.local
npm install
npm run dev
```

Component showcase (development only): http://localhost:3000/dev/ui

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generates route types and runs TypeScript |
| `npm run i18n:check` | Checks translations: keys, ICU syntax and arguments |
| `npm test` | Unit tests (Node test runner + tsx), including RPC response mapping against real fixtures |
| `npm run db:types` | Regenerates `src/lib/database.types.ts` from the database (run `npx supabase login` once) |

## Database

Migrations live in `supabase/migrations/`. After applying one, run `npm run db:types` and, if an RPC response changed, refresh `tests/fixtures/` and the types in `src/lib/api-mappers.ts`. The `quemleva` schema is not exposed through the Data API: all access goes through the `public.ql_*` functions. Migrations before `20261108000300_naming_conventions.sql` predate the conventions and keep their original names and comments as history.
