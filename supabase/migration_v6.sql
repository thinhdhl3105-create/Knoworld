-- ============================================================
-- Knoworld — Migration v6
-- Publish / Hide control for content, concepts and frameworks.
--
-- NOTE: The `published` column ALREADY EXISTS on all three tables
-- (it was created in schema.sql with default true), and the RLS
-- policies already hide unpublished rows from everyone except the
-- author. So this migration is mostly a SAFETY/IDEMPOTENT confirm —
-- you can run it, but the app works even if you skip it.
--
-- Run in: Supabase Dashboard → SQL Editor → New query (paste all, Run)
-- Safe to run on the EXISTING database. Idempotent (re-runnable).
-- ============================================================

-- 1. Make sure the column exists everywhere (no-op if already there).
alter table public.content     add column if not exists published boolean not null default true;
alter table public.concepts    add column if not exists published boolean not null default true;
alter table public.frameworks  add column if not exists published boolean not null default true;

-- 2. Helpful index for the public pages (filter published = true).
create index if not exists content_published_idx    on public.content    (published);
create index if not exists concepts_published_idx   on public.concepts   (published);
create index if not exists frameworks_published_idx on public.frameworks (published);

-- 3. Confirm the read policies: published rows are public, and the
--    author can still see their own hidden (draft) rows.
--    (These already exist from schema.sql — re-declared here so the
--    file is self-contained and safe to re-run.)
drop policy if exists "Published content readable by all" on public.content;
create policy "Published content readable by all"
  on public.content for select
  using (published = true or auth.uid() = author_id);

drop policy if exists "Concepts readable by all" on public.concepts;
create policy "Concepts readable by all"
  on public.concepts for select
  using (published = true or auth.uid() = author_id);

drop policy if exists "Frameworks readable by all" on public.frameworks;
create policy "Frameworks readable by all"
  on public.frameworks for select
  using (published = true or auth.uid() = author_id);

-- Done. You can now toggle visibility per entry from the Upload page.
