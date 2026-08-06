-- Bidirectional logging, evidence, apologies, consequences, credits, quotes, etc.

alter table offenses add column author_role text not null default 'tracker';
alter table offenses add column against_role text not null default 'subject';
alter table offenses add column author_email text not null default '';
alter table offenses add column moods text not null default '[]';
alter table offenses add column contexts text not null default '[]';
alter table offenses add column evidence text not null default '[]';
alter table offenses add column remorse int;
alter table offenses add column archived int not null default 0;

alter table disputes add column evidence text not null default '[]';

create table if not exists apologies (
  id text primary key,
  offense_id text references offenses (id) on delete set null,
  author_id text not null,
  author_role text not null,
  author_email text not null,
  body text not null,
  remorse int not null check (remorse between 1 and 5),
  status text not null default 'pending',
  response text,
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists consequences (
  id text primary key,
  title text not null,
  description text not null default '',
  trigger_rule text not null default '',
  status text not null default 'open',
  created_by_role text not null,
  created_by_email text not null,
  assigned_to_role text not null,
  due_date text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists credits (
  id text primary key,
  date timestamptz not null,
  title text not null,
  description text not null default '',
  author_role text not null,
  author_email text not null,
  about_role text not null,
  status text not null default 'pending',
  response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quotes (
  id text primary key,
  quote_text text not null,
  said_by_role text not null,
  context text not null default '',
  pinned int not null default 0,
  author_role text not null,
  author_email text not null,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id text primary key,
  user_email text not null,
  title text not null,
  body text not null default '',
  kind text not null default 'info',
  href text,
  read int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on notifications (user_email, read, created_at desc);

create table if not exists offense_templates (
  id text primary key,
  title text not null,
  category text not null,
  severity int not null check (severity between 1 and 5),
  description text not null default '',
  impact text not null default '',
  owner_role text not null default 'both',
  created_at timestamptz not null default now()
);

create table if not exists ledger_settings (
  id text primary key default 'default',
  severity_labels text not null default '{}',
  purge_forgiven_days int not null default 0,
  updated_at timestamptz not null default now()
);

insert into ledger_settings (id, severity_labels, purge_forgiven_days)
values ('default', '{}', 0)
on conflict (id) do nothing;

insert into offense_templates (id, title, category, severity, description, impact, owner_role)
values
  ('tpl-dishes', 'Left dishes in the sink again', 'Chores & mess', 2, 'Dishes left overnight.', 'I have to clean up after you.', 'both'),
  ('tpl-late', 'Late without a text', 'Time & flaking', 3, 'Showed up late with no heads-up.', 'Felt disrespected and anxious.', 'both'),
  ('tpl-phone', 'Phone during quality time', 'Tech & phones', 2, 'Scrolled through the phone while we were talking.', 'Felt ignored.', 'both'),
  ('tpl-tone', 'Tone / attitude', 'Respect', 3, 'Snapped or used a tone that crossed a line.', 'Felt small / angry.', 'both'),
  ('tpl-lie', 'Lied or omitted something', 'Lying / omission', 4, 'Was not fully honest.', 'Trust took a hit.', 'both')
on conflict (id) do nothing;
