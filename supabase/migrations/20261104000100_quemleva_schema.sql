-- QuemLeva: schema e tabelas
-- Tudo fica no schema "quemleva", fora da Data API. O acesso é só pelas RPCs public.ql_*.

create schema if not exists quemleva;
revoke all on schema quemleva from public, anon, authenticated;

create table quemleva.events (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  title            text not null check (length(trim(title)) between 1 and 120),
  event_date       date,
  event_time       time,
  location         text check (length(location) <= 200),
  adults           int  not null default 0 check (adults between 0 and 1000),
  kids             int  not null default 0 check (kids between 0 and 1000),
  notes            text check (length(notes) <= 2000),
  spliit_group_url text check (spliit_group_url ~ '^https://'),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Token de organizador separado do evento; guardamos só o hash (sha256).
create table quemleva.event_admins (
  event_id   uuid primary key references quemleva.events(id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now()
);

create table quemleva.items (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references quemleva.events(id) on delete cascade,
  name       text not null check (length(trim(name)) between 1 and 120),
  unit       text check (length(unit) <= 20),
  qty_needed numeric(10,2) check (qty_needed is null or qty_needed > 0),
  category   text check (length(category) <= 40),
  sort       int  not null default 0,
  created_at timestamptz not null default now()
);
create index items_event_sort_idx on quemleva.items (event_id, sort);

create table quemleva.participants (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references quemleva.events(id) on delete cascade,
  name            text not null check (length(trim(name)) between 1 and 60),
  device_id       uuid,
  rsvp            text check (rsvp in ('yes','no','maybe')),
  guests          int  not null default 0 check (guests between 0 and 50),
  invited_by_host boolean not null default false,
  invite_token    text unique,
  opened_at       timestamptz,
  rsvp_at         timestamptz,
  created_at      timestamptz not null default now(),
  unique (event_id, device_id)
);
create index participants_event_idx on quemleva.participants (event_id);

create table quemleva.claims (
  id             uuid primary key default gen_random_uuid(),
  item_id        uuid not null references quemleva.items(id) on delete cascade,
  participant_id uuid not null references quemleva.participants(id) on delete cascade,
  qty            numeric(10,2) not null check (qty > 0),
  note           text check (length(note) <= 200),
  amount_spent   numeric(10,2) check (amount_spent is null or amount_spent >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (item_id, participant_id)
);
create index claims_participant_idx on quemleva.claims (participant_id);

-- RLS ligada e sem policies: nenhum acesso direto por anon/authenticated.
alter table quemleva.events       enable row level security;
alter table quemleva.event_admins enable row level security;
alter table quemleva.items        enable row level security;
alter table quemleva.participants enable row level security;
alter table quemleva.claims       enable row level security;

revoke all on all tables in schema quemleva from public, anon, authenticated;
