-- Multi-tenant households. Brittaney & Michael stay on the seeded legacy household.

create table if not exists households (
  id text primary key,
  name text not null,
  mode text not null default 'couple',
  invite_code text unique,
  created_by_user_id text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists household_members (
  id text primary key,
  household_id text not null references households (id) on delete cascade,
  user_id text,
  email text not null,
  display_name text not null,
  role text not null,
  is_owner int not null default 0,
  joined_at timestamptz not null default now()
);

create unique index if not exists household_members_hh_email_idx
  on household_members (household_id, lower(email));
create index if not exists household_members_user_idx
  on household_members (user_id);
create index if not exists household_members_email_idx
  on household_members (lower(email));

-- Seed the Perry–Lucido household (id stable forever)
insert into households (id, name, mode, invite_code, created_by_user_id)
values (
  'hh-perry-lucido',
  'Perry–Lucido Ledger',
  'couple',
  'FAFO0616',
  ''
)
on conflict (id) do nothing;

insert into household_members (id, household_id, user_id, email, display_name, role, is_owner)
values
  (
    'hm-brittaney',
    'hh-perry-lucido',
    null,
    'bperrymorgan@me.com',
    'Brittaney Perry-Morgan',
    'tracker',
    1
  ),
  (
    'hm-michael',
    'hh-perry-lucido',
    null,
    'spacehoodstalian@gmail.com',
    'Michael Lucido',
    'subject',
    0
  )
on conflict (id) do nothing;

-- Scope existing ledger tables
alter table offenses add column if not exists household_id text not null default 'hh-perry-lucido';
alter table disputes add column if not exists household_id text not null default 'hh-perry-lucido';
alter table apologies add column if not exists household_id text not null default 'hh-perry-lucido';
alter table consequences add column if not exists household_id text not null default 'hh-perry-lucido';
alter table credits add column if not exists household_id text not null default 'hh-perry-lucido';
alter table quotes add column if not exists household_id text not null default 'hh-perry-lucido';
alter table notifications add column if not exists household_id text not null default 'hh-perry-lucido';
alter table offense_templates add column if not exists household_id text not null default 'hh-perry-lucido';

create index if not exists offenses_household_idx on offenses (household_id, date desc);
create index if not exists disputes_household_idx on disputes (household_id);
create index if not exists apologies_household_idx on apologies (household_id);
create index if not exists consequences_household_idx on consequences (household_id);
create index if not exists credits_household_idx on credits (household_id);
create index if not exists quotes_household_idx on quotes (household_id);
create index if not exists notifications_household_idx on notifications (household_id, user_email);
create index if not exists offense_templates_household_idx on offense_templates (household_id);

-- Profile + settings: migrate 'default' row to household id
update ledger_profile set id = 'hh-perry-lucido' where id = 'default';
update ledger_settings set id = 'hh-perry-lucido' where id = 'default';

insert into ledger_profile (
  id, tracker_name, subject_name, anniversary, tracker_birthday, subject_birthday, notes
)
values (
  'hh-perry-lucido',
  'Brittaney Perry-Morgan',
  'Michael Lucido',
  '2025-06-16',
  '1989-02-18',
  '1986-12-01',
  ''
)
on conflict (id) do nothing;

insert into ledger_settings (id, severity_labels, purge_forgiven_days)
values ('hh-perry-lucido', '{}', 0)
on conflict (id) do nothing;

-- Categories: household-scoped composite key
create table if not exists custom_categories_hh (
  household_id text not null,
  name text not null,
  primary key (household_id, name)
);

insert into custom_categories_hh (household_id, name)
select 'hh-perry-lucido', name from custom_categories
on conflict do nothing;

drop table if exists custom_categories;
alter table custom_categories_hh rename to custom_categories;

-- Ensure legacy templates belong to the household
update offense_templates set household_id = 'hh-perry-lucido' where household_id is null or household_id = '';
update offenses set household_id = 'hh-perry-lucido' where household_id is null or household_id = '';
update disputes set household_id = 'hh-perry-lucido' where household_id is null or household_id = '';
