-- Minimal anti-spam for ql_create_event: limits per device and per IP.
--
-- Nothing else is limited: joining, claiming and editing need an existing event link.
-- The IP is never stored as is: only a salted sha256 (the salt lives in quemleva.secrets,
-- out of the Data API), and log rows are deleted after a day.
--
-- Limits (generous on purpose: mobile carriers in Brazil put many people behind one IP):
--   per device:  10 events per hour, 30 per day
--   per IP:      30 events per hour, 100 per day
-- Over the limit → error 'rate_limited' (DETAIL 'hour' or 'day').

create table quemleva.secrets (
  name  text primary key,
  value text not null
);
insert into quemleva.secrets (name, value)
values ('ip_salt', encode(extensions.gen_random_bytes(32), 'hex'));

create table quemleva.create_event_log (
  id         bigint generated always as identity primary key,
  device_id  uuid,
  ip_hash    text,
  created_at timestamptz not null default now()
);
create index create_event_log_device_idx on quemleva.create_event_log (device_id, created_at desc) where device_id is not null;
create index create_event_log_ip_idx     on quemleva.create_event_log (ip_hash, created_at desc)   where ip_hash is not null;
create index create_event_log_created_idx on quemleva.create_event_log (created_at);

alter table quemleva.secrets          enable row level security;
alter table quemleva.create_event_log enable row level security;
revoke all on quemleva.secrets, quemleva.create_event_log from public, anon, authenticated;

-- Client IP as seen by the Supabase gateway (Cloudflare header first; it can't be set by the client).
-- null when the call does not come through the Data API (SQL editor, tests).
create function quemleva.request_ip_hash()
returns text
language sql stable set search_path = '' as $$
  with h as (select nullif(current_setting('request.headers', true), '')::json as headers),
       ip as (
         select nullif(trim(coalesce(
                  headers->>'cf-connecting-ip',
                  split_part(headers->>'x-forwarded-for', ',', 1))), '') as value
         from h)
  select case when ip.value is null then null
              else quemleva.hash_token((select value from quemleva.secrets where name = 'ip_salt') || ip.value)
         end
  from ip
$$;

create function quemleva.check_create_event_rate(p_device_id uuid)
returns void
language plpgsql set search_path = '' as $$
declare
  v_ip_hash text := quemleva.request_ip_hash();
begin
  -- Serialize concurrent calls from the same device or IP, so a burst can't slip past the count.
  if p_device_id is not null then perform pg_advisory_xact_lock(hashtext('ql_create:' || p_device_id::text)); end if;
  if v_ip_hash   is not null then perform pg_advisory_xact_lock(hashtext('ql_create:' || v_ip_hash)); end if;

  delete from quemleva.create_event_log where created_at < now() - interval '1 day';

  if p_device_id is not null then
    if (select count(*) from quemleva.create_event_log
        where device_id = p_device_id and created_at > now() - interval '1 hour') >= 10 then
      raise exception 'rate_limited' using detail = 'hour';
    end if;
    if (select count(*) from quemleva.create_event_log where device_id = p_device_id) >= 30 then
      raise exception 'rate_limited' using detail = 'day';
    end if;
  end if;

  if v_ip_hash is not null then
    if (select count(*) from quemleva.create_event_log
        where ip_hash = v_ip_hash and created_at > now() - interval '1 hour') >= 30 then
      raise exception 'rate_limited' using detail = 'hour';
    end if;
    if (select count(*) from quemleva.create_event_log where ip_hash = v_ip_hash) >= 100 then
      raise exception 'rate_limited' using detail = 'day';
    end if;
  end if;

  insert into quemleva.create_event_log (device_id, ip_hash) values (p_device_id, v_ip_hash);
end $$;

revoke execute on function quemleva.request_ip_hash() from public;
revoke execute on function quemleva.check_create_event_rate(uuid) from public;

-- Same signature and body as before, plus the check on the first line.
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

  insert into quemleva.events (slug, title, event_date, event_time, location, adults, kids, notes, locale, currency, kind)
  values (v_slug, trim(p_title), p_event_date, p_event_time, nullif(trim(p_location), ''),
          coalesce(p_adults, 0), coalesce(p_kids, 0), nullif(trim(p_notes), ''),
          coalesce(p_locale, 'pt-BR'), upper(coalesce(p_currency, 'BRL')), coalesce(p_kind, 'other'))
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
