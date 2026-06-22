-- ============================================================
-- Knoworld — Migration v3
-- Adds: external source links on content + Foundation↔Research links
--       (the "Theoretical Map" edges) + analytics-friendly indexes.
-- Run in: Supabase Dashboard → SQL Editor → New query (paste all, Run)
-- Safe to run on the EXISTING database. Idempotent (re-runnable).
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- 1. EXTEND public.content
--    source_url  : an external related link (article / DOI / drive),
--                  separate from paper_url (an uploaded PDF file).
-- ============================================================
alter table public.content add column if not exists source_url text;

-- ============================================================
-- 2. FOUNDATION_LINKS — edges of the Theoretical Map
--    Connects a Theoretical Foundation (content.is_foundation = true)
--    to a Research paper (content row). Both ends live in `content`.
-- ============================================================
create table if not exists public.foundation_links (
  id            uuid primary key default gen_random_uuid(),
  foundation_id uuid not null references public.content(id) on delete cascade,
  research_id   uuid not null references public.content(id) on delete cascade,
  label         text,
  author_id     uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (foundation_id, research_id)
);

create index if not exists foundation_links_foundation_idx on public.foundation_links (foundation_id);
create index if not exists foundation_links_research_idx   on public.foundation_links (research_id);

alter table public.foundation_links enable row level security;

drop policy if exists "Foundation links readable by all" on public.foundation_links;
drop policy if exists "Auth can insert foundation links" on public.foundation_links;
drop policy if exists "Authors update own foundation links" on public.foundation_links;
drop policy if exists "Authors delete own foundation links" on public.foundation_links;

create policy "Foundation links readable by all"
  on public.foundation_links for select using (true);
create policy "Auth can insert foundation links"
  on public.foundation_links for insert with check (auth.uid() = author_id);
create policy "Authors update own foundation links"
  on public.foundation_links for update using (auth.uid() = author_id);
create policy "Authors delete own foundation links"
  on public.foundation_links for delete using (auth.uid() = author_id);

-- Done. New: content.source_url, table foundation_links.
