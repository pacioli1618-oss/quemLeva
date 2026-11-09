-- The host can suspend (pause) or delete an event.
--
-- Suspended: the event and its link stay up, guests see a notice, and their changes
-- (join, RSVP, "Eu levo") raise 'event_suspended'. The host keeps editing and can reactivate.
-- Deleted: the event and everything under it go away (cascade); the link answers event_not_found.

alter table quemleva.events add column suspended_at timestamptz;

-- Like require_event, for the participant writes that a suspension blocks.
create function quemleva.require_open_event(p_slug text)
returns quemleva.events
language plpgsql stable set search_path = '' as $$
declare e quemleva.events;
begin
  e := quemleva.require_event(p_slug);
  if e.suspended_at is not null then
    raise exception 'event_suspended' using errcode = 'P0001';
  end if;
  return e;
end $$;
revoke execute on function quemleva.require_open_event(text) from public;

-- ql_get_event also returns suspended_at (ql_get_event_as_host builds on it).
create or replace function public.ql_get_event(p_slug text, p_device_id uuid default null)
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
      'spliit_group_url', e.spliit_group_url, 'suspended_at', e.suspended_at, 'updated_at', e.updated_at),
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

-- Participant writes: same bodies as before, require_event → require_open_event.
create or replace function public.ql_join_event(p_slug text, p_device_id uuid, p_name text, p_invite_token text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  e                quemleva.events;
  v_participant_id uuid;
begin
  e := quemleva.require_open_event(p_slug);

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

create or replace function public.ql_set_rsvp(p_slug text, p_device_id uuid, p_rsvp text, p_plus_ones integer default 0)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  e quemleva.events;
  p quemleva.participants;
begin
  e := quemleva.require_open_event(p_slug);
  p := quemleva.require_participant(e.id, p_device_id);
  update quemleva.participants
     set rsvp = p_rsvp, plus_ones = coalesce(p_plus_ones, 0), rsvp_at = now()
   where id = p.id;
end $$;

create or replace function public.ql_set_claim(p_slug text, p_device_id uuid, p_item_id uuid, p_quantity numeric,
                                               p_note text default null, p_amount_spent numeric default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  e        quemleva.events;
  p        quemleva.participants;
  i        quemleva.items;
  v_others numeric;
begin
  e := quemleva.require_open_event(p_slug);
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

-- Host: suspend (true) or reactivate (false). The events trigger tells open screens to reload.
create function public.ql_set_event_suspended(p_slug text, p_host_token text, p_suspended boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare e quemleva.events;
begin
  e := quemleva.require_host_event(p_slug, p_host_token);
  update quemleva.events
     set suspended_at = case when p_suspended then coalesce(suspended_at, now()) else null end,
         updated_at   = now()
   where id = e.id;
end $$;

-- Host: delete the event and everything under it. The row triggers can't find the slug of a
-- deleted event, so the "changed" notice is sent here first: open screens reload and get
-- event_not_found.
create function public.ql_delete_event(p_slug text, p_host_token text)
returns void
language plpgsql security definer set search_path = '' as $$
declare e quemleva.events;
begin
  e := quemleva.require_host_event(p_slug, p_host_token);
  begin
    perform realtime.send(jsonb_build_object('table', 'events', 'op', 'DELETE'), 'changed', 'event:' || e.slug, false);
  exception when others then
    null;  -- a Realtime failure must never block the delete
  end;
  delete from quemleva.events where id = e.id;
end $$;

revoke execute on function public.ql_set_event_suspended(text, text, boolean) from public;
revoke execute on function public.ql_delete_event(text, text) from public;
grant execute on function public.ql_set_event_suspended(text, text, boolean) to anon, authenticated;
grant execute on function public.ql_delete_event(text, text) to anon, authenticated;
