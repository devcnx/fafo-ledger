-- Spendable household perks. Opposite of a Find Out: a bill you want cashed.

create table if not exists perks (
  id text primary key,
  household_id text not null,
  title text not null,
  body text not null default '',
  kind text not null default 'favor',
  status text not null default 'available',
  granted_by_role text not null,
  granted_by_email text not null,
  assigned_to_role text not null,
  source text not null default 'manual',
  source_id text,
  expires_on text,
  redeemed_at timestamptz,
  honor_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists perks_household_idx on perks (household_id, created_at desc);
create index if not exists perks_assignee_idx on perks (household_id, assigned_to_role, status);
