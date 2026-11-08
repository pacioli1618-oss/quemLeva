# Deploy

Production runs on **Vercel** (Next.js, no Vercel-specific code) with **Supabase QuemLeva-SP**
(sa-east-1). Nothing here is tied to Vercel: any host that runs `next build && next start`
(Node 20+) works, which keeps the move to Vercel Pro, Cloudflare or a VPS a config change.

## 1. Vercel project

1. Import the GitHub repository in Vercel (framework preset: Next.js, defaults for build and output).
2. Environment variables (Production and Preview):

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://uqkyhzvdwynpkqdiuvyn.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the publishable key (`.env.example`) |

   Both are public by design: the browser calls the `ql_*` RPCs directly, and the tables are
   not exposed (see `docs/conventions.md` and the Supabase notes).
3. Region for functions: **São Paulo (gru1)**, next to the database (set in `vercel.json`; the only Vercel-specific file, ignored by other hosts).

## 2. Domain

Validation phase: `quemleva.gr1618.io`. The apex `gr1618.io` keeps its WordPress site on HostGator.

1. Vercel → Project → Settings → Domains → add `quemleva.gr1618.io`.
2. Vercel shows the CNAME target for the subdomain.
3. Where the `gr1618.io` DNS is managed (HostGator cPanel → Zone Editor, unless the nameservers
   point elsewhere): add `CNAME` · name `quemleva` · value from step 2.
4. Wait for Vercel to show the domain as valid; HTTPS is issued automatically.

Later: add `quemleva.app.br` to the same project and redirect `quemleva.gr1618.io` to it, so links
already shared in WhatsApp groups keep working.

## 3. Supabase checklist

- Realtime: public channels allowed ("private only" off) — the app listens on `event:<slug>`.
- Run the security and performance advisors after each migration.
- Auth is not used; no redirect URLs to configure.

## 4. Smoke test after each deploy

1. Phone A: create an event, add items, open Share.
2. Phone B (another browser): open the event link, join, claim an item.
3. Phone A sees the claim within a second without reloading (Realtime).
4. Open the host link on a third browser: it becomes host and lands on the event.
5. Print versions open and print on one A4 page each.

## Plan and cost

Vercel Hobby is for personal, non-commercial use. Move to Pro (or another host) before any
revenue: donations with perks, paid plans or partner offers (business model, Portão 1).
