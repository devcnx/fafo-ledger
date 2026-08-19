-- House economy: peace pays, bonds, parole, calendar acts, bargains, truce, statute.

create table if not exists peace_payouts (
  id text primary key,
  household_id text not null,
  assigned_to_role text not null,
  milestone_days integer not null,
  streak_start text not null,
  perk_id text,
  paid_on text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists peace_payouts_uniq
  on peace_payouts (household_id, assigned_to_role, milestone_days, streak_start);

create table if not exists bonds (
  id text primary key,
  household_id text not null,
  title text not null,
  body text not null default '',
  kind text not null default 'favor',
  category text not null,
  days integer not null,
  assigned_to_role text not null,
  granted_by_role text not null,
  granted_by_email text not null,
  status text not null default 'escrow',
  releases_on text not null,
  resolved_at timestamptz,
  perk_id text,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bonds_hh_idx on bonds (household_id, status);

create table if not exists paroles (
  id text primary key,
  household_id text not null,
  role text not null,
  category text not null,
  find_out_id text,
  ends_on text not null,
  created_at timestamptz not null default now()
);
create index if not exists paroles_hh_idx on paroles (household_id, role, ends_on);

create table if not exists calendar_acts (
  id text primary key,
  household_id text not null,
  kind text not null,
  year integer not null,
  perk_id text,
  acted_on text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists calendar_acts_uniq
  on calendar_acts (household_id, kind, year);

create table if not exists nudge_log (
  id text primary key,
  household_id text not null,
  user_email text not null,
  kind text not null,
  target_id text not null,
  sent_on text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists nudge_log_uniq
  on nudge_log (household_id, user_email, kind, target_id, sent_on);

create table if not exists bargain_offers (
  id text primary key,
  household_id text not null,
  find_out_id text not null,
  proposed_by_role text not null,
  title text not null,
  body text not null default '',
  due_date text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bargain_offers_fo_idx on bargain_offers (find_out_id, status);

alter table households add column if not exists truce_until text;
alter table households add column if not exists truce_note text not null default '';
alter table households add column if not exists truce_set_by text;
alter table households add column if not exists amnesty_on text;

alter table ledger_settings add column if not exists statute_days integer not null default 45;
alter table ledger_settings add column if not exists cooling_off_minutes integer not null default 20;

alter table offenses add column if not exists statute_reset_on text;
