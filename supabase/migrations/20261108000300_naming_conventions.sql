-- Apply docs/conventions.md to the database.
--
-- Renames (no data existed when this ran):
--   event_admins            -> host_tokens
--   items.qty_needed        -> items.quantity_needed
--   claims.qty              -> claims.quantity
--   participants.guests     -> participants.plus_ones
--   error qty_exceeds_remaining -> quantity_exceeds_remaining
--   realtime topic quemleva:<slug> -> event:<slug>
--   RPCs: ql_join -> ql_join_event, ql_rsvp -> ql_set_rsvp, ql_claim -> ql_set_claim,
--         ql_admin_get_event -> ql_get_event_as_host, ql_invite -> ql_invite_participant,
--         p_token -> p_host_token, admin_token -> host_token (create result)
--   helpers: rand_text -> random_text, event_by_slug -> require_event,
--            admin_event -> require_host_event, participant_for -> require_participant
--
-- Every function is dropped and recreated because PL/pgSQL bodies refer to columns by name.

------------------------------------------------------------------------
-- 1. Drop functions that reference the old names
------------------------------------------------------------------------
do $$
declare f regprocedure;
begin
  for f in
    select p.oid::regprocedure from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname like 'ql\_%'
  loop
    execute format('drop function %s', f);
  end loop;
end $$;

drop function quemleva.admin_event(text, text);
drop function quemleva.event_by_slug(text);
drop function quemleva.participant_for(uuid, uuid);
drop function quemleva.rand_text(int);

------------------------------------------------------------------------
-- 2. Rename tables, columns, constraints and indexes
------------------------------------------------------------------------
alter table quemleva.event_admins rename to host_tokens;
alter table quemleva.host_tokens rename constraint event_admins_pkey to host_tokens_pkey;
alter table quemleva.host_tokens rename constraint event_admins_event_id_fkey to host_tokens_event_id_fkey;
alter table quemleva.host_tokens rename constraint event_admins_token_hash_key to host_tokens_token_hash_key;
alter index quemleva.event_admins_event_idx rename to host_tokens_event_id_idx;

alter table quemleva.items rename column qty_needed to quantity_needed;
alter table quemleva.items rename constraint items_qty_needed_check to items_quantity_needed_check;
alter index quemleva.items_event_sort_idx rename to items_event_id_sort_idx;

alter table quemleva.claims rename column qty to quantity;
alter table quemleva.claims rename constraint claims_qty_check to claims_quantity_check;
alter index quemleva.claims_participant_idx rename to claims_participant_id_idx;

alter table quemleva.participants rename column guests to plus_ones;
alter table quemleva.participants rename constraint participants_guests_check to participants_plus_ones_check;
alter index quemleva.participants_event_idx rename to participants_event_id_idx;

------------------------------------------------------------------------
-- 3. Internal helpers (schema quemleva, not callable by clients)
------------------------------------------------------------------------
create function quemleva.random_text(n int)
returns text language sql volatile set search_path = '' as $$
  -- Alphabet without look-alikes (0/o, 1/l/i) so links survive being read aloud.
  select string_agg(substr('abcdefghjkmnpqrstuvwxyz23456789', (get_byte(b, i) % 31) + 1, 1), '' order by i)
  from (select extensions.gen_random_bytes(n) as b) x, generate_series(0, n - 1) as i
$$;

create function quemleva.require_event(p_slug text)
returns quemleva.events language plpgsql stable set search_path = '' as $$
declare e quemleva.events;
begin
  select * into e from quemleva.events where slug = p_slug;
  if not found then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;
  return e;
end $$;

create function quemleva.require_host_event(p_slug text, p_host_token text)
returns quemleva.events language plpgsql stable set search_path = '' as $$
declare e quemleva.events;
begin
  select ev.* into e
  from quemleva.events ev
  join quemleva.host_tokens h on h.event_id = ev.id
  where ev.slug = p_slug
    and h.token_hash = quemleva.hash_token(p_host_token)
    and h.revoked_at is null;
  if not found then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  return e;
end $$;

create function quemleva.require_participant(p_event_id uuid, p_device_id uuid)
returns quemleva.participants language plpgsql stable set search_path = '' as $$
declare p quemleva.participants;
begin
  select * into p from quemleva.participants
  where event_id = p_event_id and device_id = p_device_id;
  if not found then
    raise exception 'not_joined' using errcode = 'P0002';
  end if;
  return p;
end $$;

revoke execute on all functions in schema quemleva from public, anon, authenticated;

------------------------------------------------------------------------
-- 4. Public RPCs — anyone with the link
------------------------------------------------------------------------

-- Returns the host token once; only its hash is stored.
create function public.ql_create_event(
  p_title      text,
  p_event_date date default null,
  p_event_time time default null,
  p_location   text default null,
  p_adults     int  default 0,
  p_kids       int  default 0,
  p_notes      text default null,
  p_device_id  uuid default null,
  p_host_name  text default null,
  p_locale     text default 'pt-BR',
  p_currency   text default 'BRL',
  p_kind       text default 'other'
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_slug       text;
  v_host_token text;
  v_event_id   uuid;
begin
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

-- Never returns device_id or invite_token. "me" is this device's participant id, if any.
create function public.ql_get_event(p_slug text, p_device_id uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  e    quemleva.events;
  v_me uuid;
begin
  e := quemleva.require_event(p_slug);

  if p_device_id is not null then
    select id into v_me from quemleva.participants
    where event_id = e.id and device_id = p_device_id;
  end if;

  return jsonb_build_object(
    'event', jsonb_build_object(
      'id', e.id, 'slug', e.slug, 'title', e.title,
      'event_date', e.event_date, 'event_time', e.event_time, 'location', e.location,
      'adults', e.adults, 'kids', e.kids, 'notes', e.notes,
      'locale', e.locale, 'currency', e.currency, 'kind', e.kind,
      'spliit_group_url', e.spliit_group_url, 'updated_at', e.updated_at),
    'me', v_me,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'name', i.name, 'unit', i.unit, 'quantity_needed', i.quantity_needed,
        'category', i.category, 'sort', i.sort,
        'quantity_claimed', coalesce((select sum(c.quantity) from quemleva.claims c where c.item_id = i.id), 0),
        'claims', coalesce((
          select jsonb_agg(jsonb_build_object(
            'participant_id', c.participant_id, 'name', p.name, 'quantity', c.quantity,
            'note', c.note, 'amount_spent', c.amount_spent) order by c.created_at)
          from quemleva.claims c
          join quemleva.participants p on p.id = c.participant_id
          where c.item_id = i.id), '[]'::jsonb)
      ) order by i.sort, i.created_at)
      from quemleva.items i where i.event_id = e.id), '[]'::jsonb),
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'rsvp', p.rsvp, 'plus_ones', p.plus_ones,
        'invited_by_host', p.invited_by_host) order by p.created_at)
      from quemleva.participants p where p.event_id = e.id), '[]'::jsonb)
  );
end $$;

-- Marks a personal invite as opened and returns the name to prefill the join screen.
create function public.ql_open_invite(p_slug text, p_invite_token text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  e quemleva.events;
  p quemleva.participants;
begin
  e := quemleva.require_event(p_slug);
  update quemleva.participants
     set opened_at = coalesce(opened_at, now())
   where event_id = e.id and invite_token = p_invite_token
  returning * into p;
  if not found then
    raise exception 'participant_not_found' using errcode = 'P0002';
  end if;
  return jsonb_build_object('participant_id', p.id, 'name', p.name,
                            'already_linked', p.device_id is not null);
end $$;

-- Resolution order: device already joined -> rename; free invite -> bind to this device; else -> new participant.
create function public.ql_join_event(
  p_slug         text,
  p_device_id    uuid,
  p_name         text,
  p_invite_token text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  e                quemleva.events;
  v_participant_id uuid;
begin
  e := quemleva.require_event(p_slug);

  update quemleva.participants
     set name = coalesce(nullif(trim(p_name), ''), name)
   where event_id = e.id and device_id = p_device_id
  returning id into v_participant_id;
  if found then return v_participant_id; end if;

  if p_invite_token is not null then
    update quemleva.participants
       set device_id = p_device_id,
           name      = coalesce(nullif(trim(p_name), ''), name),
           opened_at = coalesce(opened_at, now())
     where event_id = e.id and invite_token = p_invite_token and device_id is null
    returning id into v_participant_id;
    if found then return v_participant_id; end if;
  end if;

  insert into quemleva.participants (event_id, name, device_id)
  values (e.id, trim(p_name), p_device_id)
  returning id into v_participant_id;
  return v_participant_id;
end $$;

create function public.ql_set_rsvp(
  p_slug      text,
  p_device_id uuid,
  p_rsvp      text,
  p_plus_ones int default 0
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  e quemleva.events;
  p quemleva.participants;
begin
  e := quemleva.require_event(p_slug);
  p := quemleva.require_participant(e.id, p_device_id);
  update quemleva.participants
     set rsvp = p_rsvp, plus_ones = coalesce(p_plus_ones, 0), rsvp_at = now()
   where id = p.id;
end $$;

-- "Eu levo": sets how much this participant brings. quantity <= 0 withdraws the claim.
-- The item row is locked so concurrent claims cannot exceed quantity_needed.
create function public.ql_set_claim(
  p_slug         text,
  p_device_id    uuid,
  p_item_id      uuid,
  p_quantity     numeric,
  p_note         text    default null,
  p_amount_spent numeric default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  e        quemleva.events;
  p        quemleva.participants;
  i        quemleva.items;
  v_others numeric;
begin
  e := quemleva.require_event(p_slug);
  p := quemleva.require_participant(e.id, p_device_id);

  select * into i from quemleva.items
  where id = p_item_id and event_id = e.id
  for update;
  if not found then
    raise exception 'item_not_found' using errcode = 'P0002';
  end if;

  select coalesce(sum(quantity), 0) into v_others
  from quemleva.claims where item_id = i.id and participant_id <> p.id;

  if coalesce(p_quantity, 0) <= 0 then
    delete from quemleva.claims where item_id = i.id and participant_id = p.id;
  else
    if i.quantity_needed is not null and v_others + p_quantity > i.quantity_needed then
      raise exception 'quantity_exceeds_remaining'
        using errcode = 'P0001', detail = greatest(i.quantity_needed - v_others, 0)::text;
    end if;

    insert into quemleva.claims (item_id, participant_id, quantity, note, amount_spent)
    values (i.id, p.id, p_quantity, nullif(trim(p_note), ''), p_amount_spent)
    on conflict (item_id, participant_id) do update
      set quantity = excluded.quantity, note = excluded.note,
          amount_spent = excluded.amount_spent, updated_at = now();
  end if;

  return jsonb_build_object(
    'item_id', i.id,
    'quantity_needed', i.quantity_needed,
    'quantity_claimed', v_others + greatest(coalesce(p_quantity, 0), 0));
end $$;

------------------------------------------------------------------------
-- 5. Host RPCs — require p_host_token
------------------------------------------------------------------------

-- Same as ql_get_event plus invite and tracking data for each participant.
create function public.ql_get_event_as_host(p_slug text, p_host_token text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare e quemleva.events;
begin
  e := quemleva.require_host_event(p_slug, p_host_token);
  return public.ql_get_event(p_slug, null)
    || jsonb_build_object(
         'is_host', true,
         'participants', coalesce((
           select jsonb_agg(jsonb_build_object(
             'id', p.id, 'name', p.name, 'rsvp', p.rsvp, 'plus_ones', p.plus_ones,
             'invited_by_host', p.invited_by_host, 'invite_token', p.invite_token,
             'is_linked', p.device_id is not null,
             'opened_at', p.opened_at, 'rsvp_at', p.rsvp_at, 'created_at', p.created_at)
             order by p.created_at)
           from quemleva.participants p where p.event_id = e.id), '[]'::jsonb));
end $$;

-- Partial update: only keys present in p_patch change; a null value clears the field.
create function public.ql_update_event(p_slug text, p_host_token text, p_patch jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare e quemleva.events;
begin
  e := quemleva.require_host_event(p_slug, p_host_token);
  update quemleva.events set
    title            = case when p_patch ? 'title'      then trim(p_patch->>'title') else title end,
    event_date       = case when p_patch ? 'event_date' then (p_patch->>'event_date')::date else event_date end,
    event_time       = case when p_patch ? 'event_time' then (p_patch->>'event_time')::time else event_time end,
    location         = case when p_patch ? 'location'   then nullif(trim(p_patch->>'location'), '') else location end,
    adults           = case when p_patch ? 'adults'     then coalesce((p_patch->>'adults')::int, 0) else adults end,
    kids             = case when p_patch ? 'kids'       then coalesce((p_patch->>'kids')::int, 0) else kids end,
    notes            = case when p_patch ? 'notes'      then nullif(trim(p_patch->>'notes'), '') else notes end,
    locale           = case when p_patch ? 'locale'     then coalesce(p_patch->>'locale', locale) else locale end,
    currency         = case when p_patch ? 'currency'   then upper(coalesce(p_patch->>'currency', currency)) else currency end,
    kind             = case when p_patch ? 'kind'       then coalesce(p_patch->>'kind', kind) else kind end,
    spliit_group_url = case when p_patch ? 'spliit_group_url' then nullif(p_patch->>'spliit_group_url', '') else spliit_group_url end,
    updated_at       = now()
  where id = e.id;
end $$;

-- p_item_id null -> insert at the end of the list; otherwise update.
create function public.ql_upsert_item(
  p_slug            text,
  p_host_token      text,
  p_item_id         uuid,
  p_name            text,
  p_unit            text    default null,
  p_quantity_needed numeric default null,
  p_category        text    default null,
  p_sort            int     default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  e         quemleva.events;
  v_item_id uuid;
begin
  e := quemleva.require_host_event(p_slug, p_host_token);

  if p_item_id is null then
    insert into quemleva.items (event_id, name, unit, quantity_needed, category, sort)
    values (e.id, trim(p_name), nullif(trim(p_unit), ''), p_quantity_needed, nullif(trim(p_category), ''),
            coalesce(p_sort, (select coalesce(max(sort), 0) + 1 from quemleva.items where event_id = e.id)))
    returning id into v_item_id;
  else
    update quemleva.items set
      name = trim(p_name), unit = nullif(trim(p_unit), ''), quantity_needed = p_quantity_needed,
      category = nullif(trim(p_category), ''), sort = coalesce(p_sort, sort)
    where id = p_item_id and event_id = e.id
    returning id into v_item_id;
    if not found then
      raise exception 'item_not_found' using errcode = 'P0002';
    end if;
  end if;
  return v_item_id;
end $$;

-- Bulk insert (suggested list, repeat event).
-- p_items: [{"name": "...", "unit": "...", "quantity_needed": 2, "category": "..."}]
create function public.ql_add_items(p_slug text, p_host_token text, p_items jsonb)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  e      quemleva.events;
  v_base int;
  v_rows int;
begin
  e := quemleva.require_host_event(p_slug, p_host_token);
  select coalesce(max(sort), 0) into v_base from quemleva.items where event_id = e.id;

  insert into quemleva.items (event_id, name, unit, quantity_needed, category, sort)
  select e.id, trim(x->>'name'), nullif(trim(x->>'unit'), ''),
         (x->>'quantity_needed')::numeric, nullif(trim(x->>'category'), ''),
         v_base + ord::int
  from jsonb_array_elements(p_items) with ordinality as t(x, ord);

  get diagnostics v_rows = row_count;
  return v_rows;
end $$;

create function public.ql_delete_item(p_slug text, p_host_token text, p_item_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare e quemleva.events;
begin
  e := quemleva.require_host_event(p_slug, p_host_token);
  delete from quemleva.items where id = p_item_id and event_id = e.id;
end $$;

-- Creates a named participant with an invite_token for a personal link.
create function public.ql_invite_participant(p_slug text, p_host_token text, p_name text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  e                quemleva.events;
  v_participant_id uuid;
  v_invite_token   text;
begin
  e := quemleva.require_host_event(p_slug, p_host_token);
  v_invite_token := quemleva.random_text(16);
  insert into quemleva.participants (event_id, name, invited_by_host, invite_token)
  values (e.id, trim(p_name), true, v_invite_token)
  returning id into v_participant_id;
  return jsonb_build_object('participant_id', v_participant_id, 'invite_token', v_invite_token);
end $$;

create function public.ql_remove_participant(p_slug text, p_host_token text, p_participant_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare e quemleva.events;
begin
  e := quemleva.require_host_event(p_slug, p_host_token);
  delete from quemleva.participants where id = p_participant_id and event_id = e.id;
end $$;

------------------------------------------------------------------------
-- 6. Realtime: topic event:<slug>
------------------------------------------------------------------------
create or replace function quemleva.notify_change()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r          record;
  v_event_id uuid;
  v_slug     text;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;

  if tg_table_name = 'events' then
    v_event_id := r.id;
  elsif tg_table_name = 'claims' then
    select i.event_id into v_event_id from quemleva.items i where i.id = r.item_id;
  else
    v_event_id := r.event_id;
  end if;

  if v_event_id is null then return null; end if;  -- cascading delete of the event
  select slug into v_slug from quemleva.events where id = v_event_id;
  if v_slug is null then return null; end if;

  begin
    perform realtime.send(
      jsonb_build_object('table', tg_table_name, 'op', tg_op),
      'changed',
      'event:' || v_slug,
      false);
  exception when others then
    null;  -- a Realtime failure must never roll back the write
  end;
  return null;
end $$;

revoke execute on function quemleva.notify_change() from public, anon, authenticated;

------------------------------------------------------------------------
-- 7. Grants: only ql_* are callable by anon/authenticated
------------------------------------------------------------------------
do $$
declare f regprocedure;
begin
  for f in
    select p.oid::regprocedure from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname like 'ql\_%'
  loop
    execute format('revoke execute on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
