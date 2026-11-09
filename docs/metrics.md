# Metrics

Three read-only views in the `quemleva` schema answer "is QuemLeva being used, and do
organizers come back?". They are not exposed through the Data API: read them in the Supabase
dashboard → **SQL Editor** (project QuemLeva-SP). Dates are in `America/Sao_Paulo`.

Created by migration `20261109000200_metrics.sql`.

## Gate 1 at a glance

```sql
select * from quemleva.metrics_gate1;
```

| Column | Meaning |
| --- | --- |
| `events_last_30_days` / `events_goal` | Events created in the last 30 days, against the goal of 100 a month. |
| `organizers` | Distinct devices that created at least one event. |
| `organizers_back_so_far` | Of those, how many created another event within 90 days of their first (so far). |
| `organizers_90_days_old` | Organizers whose first event is at least 90 days old: the only ones that can be judged. |
| `back_in_90_days_pct` / `back_goal_pct` | Share of those that came back within 90 days, against the 30% goal. Null until someone is 90 days old. |

## Week by week

```sql
select * from quemleva.metrics_weekly;
```

| Column | Meaning |
| --- | --- |
| `week` | Monday of the week the events were created. |
| `events_created` | New events. |
| `events_with_list` | ...that got at least one item. |
| `events_with_guests` | ...that at least one other person joined: the event really reached the group. |
| `guests_joined`, `claims`, `items_covered` | Totals over that week's events. |
| `organizers` / `returning_organizers` | Devices that created events that week / of those, ones that had created an event before. |

## Event by event

```sql
select * from quemleva.metrics_events order by created_on desc;
```

One row per event: items, items covered and `covered_pct`, claims, `guests_joined` (participants
other than the creator's device), confirmed, `people_expected` (confirmed + plus-ones), personal
invites sent and opened, whether it uses Spliit, whether it is suspended.

"Covered" follows the app's rule (`src/lib/item-status.ts`): an item with no quantity is covered
once someone claims it; an item with a quantity, once the claims reach it.

## Notes

- **Organizer = device.** There are no accounts, so an organizer is the device that created the
  event (`events.created_by_device`). Someone who switches phones or clears the browser counts
  as a new organizer: the return rate is a lower bound.
- **Test events count.** Delete test events (⋮ menu in My events) so they don't skew the numbers,
  or filter them out by title in `metrics_events`.
- **Deleted events are gone from the metrics too**: no history is kept, on purpose.
- Events created before this migration got `created_by_device` from the host's participant row
  when the host joined with a name; others stay null and don't count as organizers.
