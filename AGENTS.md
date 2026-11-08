<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## QuemLeva project rules

- Follow `docs/conventions.md`: English for every identifier, file, route, database object, error code, commit, comment and developer doc. Use the domain glossary in section 1. One concept, one word.
- User-facing text only through `messages/<locale>.json` (`docs/i18n.md`). Run `npm run i18n:check` after editing messages.
- Database access only through the `public.ql_*` RPCs, wrapped in `src/lib/api.ts`. Response types and snake_case → camelCase conversion live in `src/lib/api-mappers.ts`. Schema changes go in a new migration in `supabase/migrations/`; never edit an applied migration. After a migration: `npm run db:types`, and refresh `tests/fixtures/` if a response changed.
- Device storage only through `src/lib/device-store.ts`.
- Keep the app minimal. Items in `docs/improvements.md` are not built until the roadmap says so.
- Before finishing: `npm run lint`, `npm run typecheck`, `npm run i18n:check`, `npm test`, `npm run build`.
