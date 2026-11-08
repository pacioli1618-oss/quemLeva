-- ql_get_event_as_host also fills "me": the host is a participant too (claims, RSVP),
-- so one call is enough for the host's screens.

drop function public.ql_get_event_as_host(text, text);

create function public.ql_get_event_as_host(p_slug text, p_host_token text, p_device_id uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare e quemleva.events;
begin
  e := quemleva.require_host_event(p_slug, p_host_token);
  return public.ql_get_event(p_slug, p_device_id)
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

revoke execute on function public.ql_get_event_as_host(text, text, uuid) from public;
grant execute on function public.ql_get_event_as_host(text, text, uuid) to anon, authenticated;
