-- QuemLeva: preparar event_admins para mais de um link de organizador
--
-- Hoje o comportamento não muda: cada evento continua com UM token, criado em
-- ql_create_event. A tabela só deixa de ter event_id como chave primária, para que
-- as melhorias futuras (docs/melhorias.md) entrem sem migração de dados:
--   * coorganizador: um segundo token para o mesmo evento
--   * trocar o link de organizador: revoked_at no token antigo + um token novo
--   * recuperação por e-mail: emitir um token novo (só o hash fica guardado)

alter table quemleva.event_admins drop constraint event_admins_pkey;

alter table quemleva.event_admins
  add column id         uuid primary key default gen_random_uuid(),
  add column revoked_at timestamptz;

alter table quemleva.event_admins
  add constraint event_admins_token_hash_key unique (token_hash);

create index event_admins_event_idx on quemleva.event_admins (event_id);

-- Token revogado deixa de valer.
create or replace function quemleva.admin_event(p_slug text, p_token text)
returns quemleva.events language plpgsql stable set search_path = '' as $$
declare e quemleva.events;
begin
  select ev.* into e
  from quemleva.events ev
  join quemleva.event_admins a on a.event_id = ev.id
  where ev.slug = p_slug
    and a.token_hash = quemleva.hash_token(p_token)
    and a.revoked_at is null;
  if not found then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  return e;
end $$;

revoke execute on function quemleva.admin_event(text, text) from public, anon, authenticated;
