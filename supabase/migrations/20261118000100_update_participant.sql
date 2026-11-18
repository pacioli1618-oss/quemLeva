-- The host can fix a guest's name and answer for them (someone who replied by phone,
-- a typo in an invite). Works while the event is suspended, like the other host writes.
--
-- p_rsvp null (or left out) means "no answer yet". rsvp_at moves only when the answer or plus-ones change,
-- so renaming someone does not look like a fresh reply.

create function public.ql_update_participant(
  p_slug           text,
  p_host_token     text,
  p_participant_id uuid,
  p_name           text,
  p_rsvp           text    default null,
  p_plus_ones      integer default 0
)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  e           quemleva.events;
  p           quemleva.participants;
  v_plus_ones integer;
begin
  e := quemleva.require_host_event(p_slug, p_host_token);

  select * into p from quemleva.participants
  where id = p_participant_id and event_id = e.id
  for update;
  if not found then
    raise exception 'participant_not_found' using errcode = 'P0002';
  end if;

  -- Nobody brings plus-ones to an event they are not going to.
  v_plus_ones := case when p_rsvp is null or p_rsvp = 'no' then 0 else coalesce(p_plus_ones, 0) end;

  update quemleva.participants
     set name      = trim(p_name),
         rsvp      = p_rsvp,
         plus_ones = v_plus_ones,
         rsvp_at   = case
                       when p_rsvp is null then null
                       when rsvp is distinct from p_rsvp or plus_ones <> v_plus_ones then now()
                       else rsvp_at
                     end
   where id = p.id;
end $$;

revoke execute on function public.ql_update_participant(text, text, uuid, text, text, integer) from public;
grant execute on function public.ql_update_participant(text, text, uuid, text, text, integer) to anon, authenticated;
