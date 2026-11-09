-- Metrics for the beta and for Gate 1 (roadmap): read-only views, out of the Data API.
-- Read them in the Supabase SQL editor (docs/metrics.md). Times are in America/Sao_Paulo.
--
-- To count returning organizers without accounts, each event now records the device that
-- created it (events.created_by_device): the same random device id the app already sends.
-- Deleted events leave the metrics with everything else (no history is kept on purpose).

alter table quemleva.events add column created_by_device uuid;
create index events_created_by_device_idx on quemleva.events (created_by_device, created_at)
  where created_by_device is not null;

-- Existing events: the host joined in the same transaction as the event.
update quemleva.events e
   set created_by_device = p.device_id
  from quemleva.participants p
 where p.event_id = e.id and p.created_at = e.created_at and p.device_id is not null
   and e.created_by_device is null;

-- ql_create_event: same as before, plus created_by_device.
create or replace function public.ql_create_event(
  p_title text, p_event_date date default null, p_event_time time default null, p_location text default null,
  p_adults integer default 0, p_kids integer default 0, p_notes text default null, p_device_id uuid default null,
  p_host_name text default null, p_locale text default 'pt-BR', p_currency text default 'BRL', p_kind text default 'other')
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_slug       text;
  v_host_token text;
  v_event_id   uuid;
begin
  perform quemleva.check_create_event_rate(p_device_id);

  loop
    v_slug := quemleva.random_text(12);
    exit when not exists (select 1 from quemleva.events where slug = v_slug);
  end loop;
  v_host_token := quemleva.random_text(32);

  insert into quemleva.events (slug, title, event_date, event_time, location, adults, kids, notes, locale, currency, kind,
                               created_by_device)
  values (v_slug, trim(p_title), p_event_date, p_event_time, nullif(trim(p_location), ''),
          coalesce(p_adults, 0), coalesce(p_kids, 0), nullif(trim(p_notes), ''),
          coalesce(p_locale, 'pt-BR'), upper(coalesce(p_currency, 'BRL')), coalesce(p_kind, 'other'),
          p_device_id)
  returning id into v_event_id;

  insert into quemleva.host_tokens (event_id, token_hash)
  values (v_event_id, quemleva.hash_token(v_host_token));

  -- The host joins as a confirmed participant when the device and a name are known.
  if p_device_id is not null and nullif(trim(p_host_name), '') is not null then
    insert into quemleva.participants (event_id, name, device_id, rsvp, rsvp_at)
    values (v_event_id, trim(p_host_name), p_device_id, 'yes', now());
  end if;

  return jsonb_build_object('event_id', v_event_id, 'slug', v_slug, 'host_token', v_host_token);
end $$;

-- One row per event: how far it got. "Guests" are participants other than the creator's device.
-- An item is covered by the same rule as the app (src/lib/item-status.ts): open items once
-- someone claims them, counted items once the claims reach quantity_needed.
create view quemleva.metrics_events with (security_invoker = true) as
with item_status as (
  select i.event_id,
         coalesce(sum(c.quantity), 0) as claimed,
         count(c.id) as claim_count,
         case when i.quantity_needed is null then count(c.id) > 0
              else coalesce(sum(c.quantity), 0) >= i.quantity_needed end as is_covered
    from quemleva.items i
    left join quemleva.claims c on c.item_id = i.id
   group by i.id
)
select e.slug,
       e.title,
       e.kind,
       e.locale,
       (e.created_at at time zone 'America/Sao_Paulo')::date as created_on,
       e.event_date,
       (select count(*) from item_status s where s.event_id = e.id)                                as items,
       (select count(*) from item_status s where s.event_id = e.id and s.is_covered)               as items_covered,
       (select round(100.0 * avg(s.is_covered::int)) from item_status s where s.event_id = e.id)   as covered_pct,
       (select coalesce(sum(s.claim_count), 0) from item_status s where s.event_id = e.id)         as claims,
       (select count(*) from quemleva.participants p
         where p.event_id = e.id and p.device_id is distinct from e.created_by_device
           and p.device_id is not null)                                                             as guests_joined,
       (select count(*) from quemleva.participants p where p.event_id = e.id and p.rsvp = 'yes')   as confirmed,
       (select coalesce(sum(1 + p.plus_ones), 0) from quemleva.participants p
         where p.event_id = e.id and p.rsvp = 'yes')                                               as people_expected,
       (select count(*) from quemleva.participants p where p.event_id = e.id and p.invited_by_host) as invited,
       (select count(*) from quemleva.participants p
         where p.event_id = e.id and p.invited_by_host and p.opened_at is not null)                as invites_opened,
       e.spliit_group_url is not null                                                               as uses_spliit,
       e.suspended_at is not null                                                                   as is_suspended,
       e.created_by_device
  from quemleva.events e;

-- One row per week (Monday start): is the app being used, and do people come back?
create view quemleva.metrics_weekly with (security_invoker = true) as
with first_event as (
  select created_by_device, min(created_at) as first_at
    from quemleva.events where created_by_device is not null
   group by created_by_device
),
events as (
  select date_trunc('week', e.created_at at time zone 'America/Sao_Paulo')::date as week,
         e.created_by_device,
         f.first_at = e.created_at as is_first,
         m.items, m.guests_joined, m.claims, m.items_covered
    from quemleva.events e
    join quemleva.metrics_events m on m.slug = e.slug
    left join first_event f on f.created_by_device = e.created_by_device
)
select week,
       count(*)                                                        as events_created,
       count(*) filter (where items > 0)                               as events_with_list,
       count(*) filter (where guests_joined > 0)                       as events_with_guests,
       sum(guests_joined)                                              as guests_joined,
       sum(claims)                                                     as claims,
       sum(items_covered)                                              as items_covered,
       count(distinct created_by_device)                               as organizers,
       count(distinct created_by_device) filter (where not is_first)   as returning_organizers
  from events
 group by week
 order by week desc;

-- Gate 1 (February): 100 events a month, and 30% of organizers back within 90 days.
-- "Back" = created another event within 90 days of their first. Only organizers whose first
-- event is at least 90 days old can be judged; the "so far" numbers include everyone.
create view quemleva.metrics_gate1 with (security_invoker = true) as
with hosts as (
  select created_by_device,
         min(created_at) as first_at,
         count(*) as events,
         bool_or(created_at > (select min(created_at) from quemleva.events x
                                where x.created_by_device = e.created_by_device)
                 and created_at <= (select min(created_at) from quemleva.events x
                                     where x.created_by_device = e.created_by_device) + interval '90 days') as came_back
    from quemleva.events e
   where created_by_device is not null
   group by created_by_device
)
select (select count(*) from quemleva.events where created_at > now() - interval '30 days')  as events_last_30_days,
       100                                                                                   as events_goal,
       (select count(*) from hosts)                                                          as organizers,
       (select count(*) from hosts where came_back)                                          as organizers_back_so_far,
       (select count(*) from hosts where first_at <= now() - interval '90 days')             as organizers_90_days_old,
       (select count(*) from hosts where first_at <= now() - interval '90 days' and came_back) as organizers_back_in_90_days,
       (select round(100.0 * avg(came_back::int)) from hosts
         where first_at <= now() - interval '90 days')                                      as back_in_90_days_pct,
       30                                                                                    as back_goal_pct;

revoke all on quemleva.metrics_events, quemleva.metrics_weekly, quemleva.metrics_gate1 from public, anon, authenticated;
