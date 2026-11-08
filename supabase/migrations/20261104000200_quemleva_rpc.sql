-- QuemLeva: helpers internos (schema quemleva) e RPCs públicas (public.ql_*)
--
-- Modelo de acesso sem conta:
--   * slug (12 caracteres aleatórios)     -> quem tem o link vê o evento
--   * device_id (uuid gerado no navegador) -> identifica o participante
--   * admin_token (32 caracteres)          -> ações de organizador; só o hash fica no banco
--
-- Erros de negócio usados pelo app:
--   event_not_found, not_authorized, not_joined, item_not_found,
--   participant_not_found, qty_exceeds_remaining (o DETAIL traz quanto ainda falta)

------------------------------------------------------------------------
-- Helpers internos
------------------------------------------------------------------------

create or replace function quemleva.rand_text(n int)
returns text language sql volatile set search_path = '' as $$
  select string_agg(substr('abcdefghjkmnpqrstuvwxyz23456789', (get_byte(b, i) % 31) + 1, 1), '' order by i)
  from (select extensions.gen_random_bytes(n) as b) x, generate_series(0, n - 1) as i
$$;

create or replace function quemleva.hash_token(t text)
returns text language sql immutable set search_path = '' as $$
  select encode(extensions.digest(t, 'sha256'), 'hex')
$$;

create or replace function quemleva.event_by_slug(p_slug text)
returns quemleva.events language plpgsql stable set search_path = '' as $$
declare e quemleva.events;
begin
  select * into e from quemleva.events where slug = p_slug;
  if not found then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;
  return e;
end $$;

create or replace function quemleva.admin_event(p_slug text, p_token text)
returns quemleva.events language plpgsql stable set search_path = '' as $$
declare e quemleva.events;
begin
  select ev.* into e
  from quemleva.events ev
  join quemleva.event_admins a on a.event_id = ev.id
  where ev.slug = p_slug and a.token_hash = quemleva.hash_token(p_token);
  if not found then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  return e;
end $$;

create or replace function quemleva.participant_for(p_event_id uuid, p_device_id uuid)
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
-- Público (quem tem o link)
------------------------------------------------------------------------

-- Cria o evento. Devolve o slug e o admin_token, que só aparece aqui, uma única vez.
-- Se vierem device_id e host_name, o organizador já entra como participante confirmado.
create or replace function public.ql_create_event(
  p_title      text,
  p_event_date date    default null,
  p_event_time time    default null,
  p_location   text    default null,
  p_adults     int     default 0,
  p_kids       int     default 0,
  p_notes      text    default null,
  p_device_id  uuid    default null,
  p_host_name  text    default null
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

  insert into quemleva.events (slug, title, event_date, event_time, location, adults, kids, notes)
  values (v_slug, trim(p_title), p_event_date, p_event_time, nullif(trim(p_location), ''),
          coalesce(p_adults, 0), coalesce(p_kids, 0), nullif(trim(p_notes), ''))
  returning id into v_id;

  insert into quemleva.event_admins (event_id, token_hash)
  values (v_id, quemleva.hash_token(v_token));

  if p_device_id is not null and nullif(trim(p_host_name), '') is not null then
    insert into quemleva.participants (event_id, name, device_id, rsvp, rsvp_at)
    values (v_id, trim(p_host_name), p_device_id, 'yes', now());
  end if;

  return jsonb_build_object('event_id', v_id, 'slug', v_slug, 'admin_token', v_token);
end $$;

-- Lê o evento inteiro: dados, itens com quem leva e participantes.
-- Nunca devolve device_id nem invite_token. "me" é o participant_id deste navegador, quando houver.
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

-- Abre um convite nominal: marca opened_at e devolve o nome para preencher a tela "Entrar no evento".
create or replace function public.ql_open_invite(p_slug text, p_invite_token text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  e quemleva.events;
  p quemleva.participants;
begin
  e := quemleva.event_by_slug(p_slug);
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

-- Entra no evento com um nome. Ordem de resolução:
--   1. o navegador já entrou -> atualiza o nome
--   2. veio um convite ainda livre (ou já deste navegador) -> vincula o convite ao navegador
--   3. caso contrário -> cria um participante novo
create or replace function public.ql_join(
  p_slug         text,
  p_device_id    uuid,
  p_name         text,
  p_invite_token text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  e    quemleva.events;
  v_id uuid;
begin
  e := quemleva.event_by_slug(p_slug);

  update quemleva.participants
     set name = coalesce(nullif(trim(p_name), ''), name)
   where event_id = e.id and device_id = p_device_id
  returning id into v_id;
  if found then return v_id; end if;

  if p_invite_token is not null then
    update quemleva.participants
       set device_id = p_device_id,
           name      = coalesce(nullif(trim(p_name), ''), name),
           opened_at = coalesce(opened_at, now())
     where event_id = e.id and invite_token = p_invite_token and device_id is null
    returning id into v_id;
    if found then return v_id; end if;
  end if;

  insert into quemleva.participants (event_id, name, device_id)
  values (e.id, trim(p_name), p_device_id)
  returning id into v_id;
  return v_id;
end $$;

-- Confirma presença: yes / no / maybe, com o número de acompanhantes.
create or replace function public.ql_rsvp(
  p_slug      text,
  p_device_id uuid,
  p_rsvp      text,
  p_guests    int default 0
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  e quemleva.events;
  p quemleva.participants;
begin
  e := quemleva.event_by_slug(p_slug);
  p := quemleva.participant_for(e.id, p_device_id);
  update quemleva.participants
     set rsvp = p_rsvp, guests = coalesce(p_guests, 0), rsvp_at = now()
   where id = p.id;
end $$;

-- "Eu levo": define quanto este participante leva de um item. qty <= 0 desiste do item.
-- A linha do item fica travada durante a conta, para dois pedidos simultâneos não
-- passarem de qty_needed. Itens sem qty_needed aceitam qualquer quantidade.
create or replace function public.ql_claim(
  p_slug         text,
  p_device_id    uuid,
  p_item_id      uuid,
  p_qty          numeric,
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
  e := quemleva.event_by_slug(p_slug);
  p := quemleva.participant_for(e.id, p_device_id);

  select * into i from quemleva.items
  where id = p_item_id and event_id = e.id
  for update;
  if not found then
    raise exception 'item_not_found' using errcode = 'P0002';
  end if;

  select coalesce(sum(qty), 0) into v_others
  from quemleva.claims where item_id = i.id and participant_id <> p.id;

  if coalesce(p_qty, 0) <= 0 then
    delete from quemleva.claims where item_id = i.id and participant_id = p.id;
  else
    if i.qty_needed is not null and v_others + p_qty > i.qty_needed then
      raise exception 'qty_exceeds_remaining'
        using errcode = 'P0001', detail = greatest(i.qty_needed - v_others, 0)::text;
    end if;

    insert into quemleva.claims (item_id, participant_id, qty, note, amount_spent)
    values (i.id, p.id, p_qty, nullif(trim(p_note), ''), p_amount_spent)
    on conflict (item_id, participant_id) do update
      set qty = excluded.qty, note = excluded.note,
          amount_spent = excluded.amount_spent, updated_at = now();
  end if;

  return jsonb_build_object(
    'item_id', i.id,
    'qty_needed', i.qty_needed,
    'qty_claimed', v_others + greatest(coalesce(p_qty, 0), 0));
end $$;

------------------------------------------------------------------------
-- Organizador (exigem admin_token)
------------------------------------------------------------------------

-- Igual a ql_get_event, mais os dados de convite e acompanhamento dos participantes.
create or replace function public.ql_admin_get_event(p_slug text, p_token text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare e quemleva.events;
begin
  e := quemleva.admin_event(p_slug, p_token);
  return public.ql_get_event(p_slug, null)
    || jsonb_build_object(
         'is_admin', true,
         'participants', coalesce((
           select jsonb_agg(jsonb_build_object(
             'id', p.id, 'name', p.name, 'rsvp', p.rsvp, 'guests', p.guests,
             'invited_by_host', p.invited_by_host, 'invite_token', p.invite_token,
             'linked', p.device_id is not null,
             'opened_at', p.opened_at, 'rsvp_at', p.rsvp_at, 'created_at', p.created_at)
             order by p.created_at)
           from quemleva.participants p where p.event_id = e.id), '[]'::jsonb));
end $$;

-- Atualiza o evento a partir de um patch em JSON. Só mexe nas chaves enviadas;
-- uma chave com null limpa o campo.
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
    spliit_group_url = case when p_patch ? 'spliit_group_url' then nullif(p_patch->>'spliit_group_url', '') else spliit_group_url end,
    updated_at       = now()
  where id = e.id;
end $$;

-- Cria um item (p_item_id null) ou atualiza um existente. Sem p_sort, o item novo vai para o fim da lista.
create or replace function public.ql_upsert_item(
  p_slug       text,
  p_token      text,
  p_item_id    uuid,
  p_name       text,
  p_unit       text    default null,
  p_qty_needed numeric default null,
  p_category   text    default null,
  p_sort       int     default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  e    quemleva.events;
  v_id uuid;
begin
  e := quemleva.admin_event(p_slug, p_token);

  if p_item_id is null then
    insert into quemleva.items (event_id, name, unit, qty_needed, category, sort)
    values (e.id, trim(p_name), nullif(trim(p_unit), ''), p_qty_needed, nullif(trim(p_category), ''),
            coalesce(p_sort, (select coalesce(max(sort), 0) + 1 from quemleva.items where event_id = e.id)))
    returning id into v_id;
  else
    update quemleva.items set
      name = trim(p_name), unit = nullif(trim(p_unit), ''), qty_needed = p_qty_needed,
      category = nullif(trim(p_category), ''), sort = coalesce(p_sort, sort)
    where id = p_item_id and event_id = e.id
    returning id into v_id;
    if not found then
      raise exception 'item_not_found' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end $$;

-- Adiciona vários itens de uma vez (lista pronta, calculadora de churrasco, "repetir evento").
-- p_items: [{"name": "...", "unit": "...", "qty_needed": 2, "category": "..."}]
create or replace function public.ql_add_items(p_slug text, p_token text, p_items jsonb)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  e      quemleva.events;
  v_base int;
  v_n    int;
begin
  e := quemleva.admin_event(p_slug, p_token);
  select coalesce(max(sort), 0) into v_base from quemleva.items where event_id = e.id;

  insert into quemleva.items (event_id, name, unit, qty_needed, category, sort)
  select e.id, trim(x->>'name'), nullif(trim(x->>'unit'), ''),
         (x->>'qty_needed')::numeric, nullif(trim(x->>'category'), ''),
         v_base + ord::int
  from jsonb_array_elements(p_items) with ordinality as t(x, ord);

  get diagnostics v_n = row_count;
  return v_n;
end $$;

create or replace function public.ql_delete_item(p_slug text, p_token text, p_item_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare e quemleva.events;
begin
  e := quemleva.admin_event(p_slug, p_token);
  delete from quemleva.items where id = p_item_id and event_id = e.id;
end $$;

-- Convite nominal: cria o participante com um invite_token para o link individual.
create or replace function public.ql_invite(p_slug text, p_token text, p_name text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  e     quemleva.events;
  v_id  uuid;
  v_tok text;
begin
  e := quemleva.admin_event(p_slug, p_token);
  v_tok := quemleva.rand_text(16);
  insert into quemleva.participants (event_id, name, invited_by_host, invite_token)
  values (e.id, trim(p_name), true, v_tok)
  returning id into v_id;
  return jsonb_build_object('participant_id', v_id, 'invite_token', v_tok);
end $$;

create or replace function public.ql_remove_participant(p_slug text, p_token text, p_participant_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare e quemleva.events;
begin
  e := quemleva.admin_event(p_slug, p_token);
  delete from quemleva.participants where id = p_participant_id and event_id = e.id;
end $$;

------------------------------------------------------------------------
-- Permissões: só as ql_* ficam executáveis por anon/authenticated
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
