-- QuemLeva: avisos em tempo real por Broadcast
--
-- Não usamos postgres_changes porque ele exigiria SELECT direto nas tabelas por anon.
-- Toda mudança envia um aviso leve ("changed") no canal público "quemleva:<slug>",
-- e o cliente chama ql_get_event de novo (vale agrupar avisos em sequência, ~300 ms).
-- O aviso não leva dados do evento: quem não conhece o slug não recebe nada útil.
--
-- No cliente:
--   supabase.channel(`quemleva:${slug}`)
--     .on('broadcast', { event: 'changed' }, refetch)
--     .subscribe()

create or replace function quemleva.notify_change()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r        record;
  v_event  uuid;
  v_slug   text;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;

  if tg_table_name = 'events' then
    v_event := r.id;
  elsif tg_table_name = 'claims' then
    select i.event_id into v_event from quemleva.items i where i.id = r.item_id;
  else
    v_event := r.event_id;
  end if;

  if v_event is null then return null; end if;   -- cascata de exclusão do evento
  select slug into v_slug from quemleva.events where id = v_event;
  if v_slug is null then return null; end if;

  begin
    perform realtime.send(
      jsonb_build_object('table', tg_table_name, 'op', tg_op),
      'changed',
      'quemleva:' || v_slug,
      false);
  exception when others then
    null;  -- uma falha no Realtime não pode desfazer a escrita
  end;
  return null;
end $$;

revoke execute on function quemleva.notify_change() from public, anon, authenticated;

create trigger events_notify       after update                   on quemleva.events
  for each row execute function quemleva.notify_change();
create trigger items_notify        after insert or update or delete on quemleva.items
  for each row execute function quemleva.notify_change();
create trigger participants_notify after insert or update or delete on quemleva.participants
  for each row execute function quemleva.notify_change();
create trigger claims_notify       after insert or update or delete on quemleva.claims
  for each row execute function quemleva.notify_change();
