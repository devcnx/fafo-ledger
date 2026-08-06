-- Shared FAFO ledger (household-scoped, both signed-in partners can access)

create table if not exists ledger_profile (
  id text primary key default 'default',
  tracker_name text not null,
  subject_name text not null,
  anniversary text not null,
  tracker_birthday text not null,
  subject_birthday text not null,
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists offenses (
  id text primary key,
  date timestamptz not null,
  severity int not null check (severity between 1 and 5),
  category text not null,
  title text not null,
  description text not null,
  impact text not null default '',
  status text not null default 'open',
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists offenses_date_idx on offenses (date desc);
create index if not exists offenses_status_idx on offenses (status);

create table if not exists disputes (
  id text primary key,
  offense_id text not null references offenses (id) on delete cascade,
  author_id text not null,
  author_email text not null,
  author_role text not null,
  kind text not null default 'dispute',
  body text not null,
  status text not null default 'pending',
  response text,
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists disputes_offense_id_idx on disputes (offense_id);
create index if not exists disputes_status_idx on disputes (status);

create table if not exists custom_categories (
  name text primary key
);
