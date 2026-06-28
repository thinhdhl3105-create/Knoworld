-- ============================================================================
-- migration_v12_site_content.sql
-- Editable site content (portfolio + profile). Anyone can READ, only the
-- admin email can WRITE. Run this in the Supabase SQL editor.
-- ============================================================================

create table if not exists public.site_content (
  key        text primary key,                 -- e.g. 'portfolio:index', 'profile'
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

-- Keep updated_at fresh on every write.
create or replace function public.touch_site_content()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_site_content on public.site_content;
create trigger trg_touch_site_content
  before update on public.site_content
  for each row execute function public.touch_site_content();

-- --- Policies ---------------------------------------------------------------
-- READ: everyone (anonymous visitors included) can view content.
drop policy if exists site_content_read on public.site_content;
create policy site_content_read
  on public.site_content
  for select
  using (true);

-- WRITE: only the admin account may insert/update/delete.
-- Change the email below if the admin account changes.
drop policy if exists site_content_write on public.site_content;
create policy site_content_write
  on public.site_content
  for all
  to authenticated
  using ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' );

-- Seed empty rows so the first read never errors.
insert into public.site_content (key, data) values
  ('portfolio:index', '{}'::jsonb),
  ('profile',         '{}'::jsonb)
on conflict (key) do nothing;
