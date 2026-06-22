-- ============================================================
-- Knoworld — Migration v4
-- Adds student metadata to case studies:
--   student_name : author(s) of the case study (comma-separated)
--   school       : university / institution
--   year         : year the project was done / school year
-- Run in: Supabase Dashboard → SQL Editor → New query (paste all, Run)
-- Safe to run on the EXISTING database. Idempotent (re-runnable).
-- ============================================================

alter table public.content add column if not exists student_name text;
alter table public.content add column if not exists school       text;
alter table public.content add column if not exists year         text;

-- Done. New columns: content.student_name, content.school, content.year
