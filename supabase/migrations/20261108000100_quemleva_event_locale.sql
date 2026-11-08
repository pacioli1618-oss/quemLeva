-- QuemLeva: idioma, moeda e tipo do evento
--
-- A interface segue o idioma de cada pessoa (cookie / navegador). O evento guarda:
--   locale   -> idioma padrão de quem criou: impressão A4, texto do Spliit, lista sugerida
--   currency -> moeda dos gastos (ISO 4217), igual para todos os participantes
--   kind     -> tipo do evento (código traduzido em messages/*.json → EventKind)

alter table quemleva.events
  add column locale   text not null default 'pt-BR' check (locale in ('pt-BR', 'es', 'en')),
  add column currency text not null default 'BRL'   check (currency ~ '^[A-Z]{3}$'),
  add column kind     text not null default 'other' check (kind in ('barbecue', 'lunch', 'birthday', 'christmas', 'other'));

-- A assinatura de ql_create_event muda: remove a antiga antes de criar a nova.
drop function if exists public.ql_create_event(text, date, time, text, int, int, text, uuid, text);

create function public.ql_create_event(
  p_title      text,
  p_event_date date    default null,
  p_event_time time    default null,
  p_location   text    default null,
  p_adults     int     default 0,
  p_kids       int     default 0,
  p_notes      text    default null,
  p_device_id  uuid    default null,
  p_host_name  text    default null,
  p_locale     text    default 'pt-BR',
  p_currency   text    default 'BRL',
  p_kind       text    default 'other'
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_slug  text;
  v_token text;
  v_id    uuid;
begin
  loop
    v_slug := quemleva.rand_text(12);
    exit when not exists (select 1 from quemleva.events where slug = v_slug);
  end loop;
  v_token := quemleva.rand_text(32);

  insert into quemleva.events (slug, title, event_date, event_time, location, adults, kids, notes, locale, currency, kind)
  values (v_slug, trim(p_title), p_event_date, p_event_time, nullif(trim(p_location), ''),
          coalesce(p_adults, 0), coalesce(p_kids, 0), nullif(trim(p_notes), ''),
          coalesce(p_locale, 'pt-BR'), upper(coalesce(p_currency, 'BRL')), coalesce(p_kind, 'other'))
  returning id into v_id;

  insert into quemleva.event_admins (event_id, token_hash)
  values (v_id, quemleva.hash_token(v_token));

  if p_device_id is not null and nullif(trim(p_host_name), '') is not null then
    insert into quemleva.participants (event_id, name, device_id, rsvp, rsvp_at)
    values (v_id, trim(p_host_name), p_device_id, 'yes', now());
  end if;

  return jsonb_build_object('event_id', v_id, 'slug', v_slug, 'admin_token', v_token);
end $$;

revoke execute on function public.ql_create_event(text, date, time, text, int, int, text, uuid, text, text, text, text) from public;
grant execute on function public.ql_create_event(text, date, time, text, int, int, text, uuid, text, text, text, text) to anon, authenticated;

-- ql_get_event passa a devolver locale, currency e kind (mesma assinatura).
create or replace function public.ql_get_event(p_slug text, p_device_id uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  e    quemleva.events;
  v_me uuid;
begin
  e := quemleva.event_by_slug(p_slug);

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
        'id', i.id, 'name', i.name, 'unit', i.unit, 'qty_needed', i.qty_needed,
        'category', i.category, 'sort', i.sort,
        'qty_claimed', coalesce((select sum(c.qty) from quemleva.claims c where c.item_id = i.id), 0),
        'claims', coalesce((
          select jsonb_agg(jsonb_build_object(
            'participant_id', c.participant_id, 'name', p.name, 'qty', c.qty,
            'note', c.note, 'amount_spent', c.amount_spent) order by c.created_at)
          from quemleva.claims c
          join quemleva.participants p on p.id = c.participant_id
          where c.item_id = i.id), '[]'::jsonb)
      ) order by i.sort, i.created_at)
      from quemleva.items i where i.event_id = e.id), '[]'::jsonb),
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'rsvp', p.rsvp, 'guests', p.guests,
        'invited_by_host', p.invited_by_host) order by p.created_at)
      from quemleva.participants p where p.event_id = e.id), '[]'::jsonb)
  );
end $$;

-- ql_update_event aceita locale, currency e kind no patch (mesma assinatura).
create or replace function public.ql_update_event(p_slug text, p_token text, p_patch jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare e quemleva.events;
begin
  e := quemleva.admin_event(p_slug, p_token);
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
