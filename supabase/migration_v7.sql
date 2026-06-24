-- ============================================================
-- Knoworld — Migration v7
-- Adds structured AUTHORS to research papers.
--
-- `authors` is a JSON array of objects, each:
--   { "name": "Jane Doe", "role": "first" }
-- where role ∈ ('first', 'co', 'corresponding').
--
-- Theoretical Foundations need NO schema change — they remain
-- content rows with kind = 'research' and is_foundation = true.
-- (The separate "Theoretical Foundation" type in the upload form
-- is a UI convenience that maps onto those same columns.)
--
-- Run in: Supabase Dashboard → SQL Editor → New query (paste all, Run)
-- Safe to run on the EXISTING database. Idempotent (re-runnable).
-- ============================================================

-- 1. Structured authors for research papers (and anything else later).
alter table public.content
  add column if not exists authors jsonb not null default '[]'::jsonb;

-- 2. (Optional) quick sanity check — should return 0 rows the first time.
-- select id, title, authors from public.content where kind = 'research';
