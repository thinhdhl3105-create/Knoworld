-- ============================================================
-- Knoworld — Migration v8
-- Adds journal / publication name + publication type to research papers.
--
--   publication  text  — name of the journal / conference / book (venue)
--   paper_type   text  — one of: 'article' (Research Article),
--                                 'conference' (Conference),
--                                 'book_chapter' (Book Chapter)
--
-- Only meaningful for content rows with kind = 'research'
-- (Theoretical Foundations leave both NULL). No FK / enum needed —
-- stored as plain text, validated by the upload form.
--
-- Run in: Supabase Dashboard → SQL Editor → New query (paste all, Run)
-- Safe to run on the EXISTING database. Idempotent (re-runnable).
-- ============================================================

alter table public.content
  add column if not exists publication text;

alter table public.content
  add column if not exists paper_type  text;

-- Backfill existing research papers to the default type.
update public.content
  set paper_type = 'article'
  where kind = 'research'
    and is_foundation = false
    and paper_type is null;

-- (Optional) sanity check:
-- select id, title, publication, paper_type from public.content where kind = 'research';
