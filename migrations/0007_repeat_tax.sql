-- Repeat tax: FO stacks when they keep fucking around.

alter table find_outs add column if not exists repeat_count integer not null default 1;
