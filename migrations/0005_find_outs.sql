-- The FO: sentences issued after someone fucks around.

create table if not exists find_outs (
  id text primary key,
  household_id text not null,
  offense_id text,
  title text not null,
  body text not null default '',
  issued_by_role text not null,
  issued_by_email text not null,
  assigned_to_role text not null,
  status text not null default 'issued',
  due_date text,
  acknowledged_at timestamptz,
  served_at timestamptz,
  escalation_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists find_outs_household_idx on find_outs (household_id, created_at desc);
create index if not exists find_outs_offense_idx on find_outs (offense_id);
create index if not exists find_outs_status_idx on find_outs (household_id, status);
