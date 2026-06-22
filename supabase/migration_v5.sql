-- ============================================================
-- Knoworld — Migration v5
-- Adds brand metadata to case studies (Video + Student):
--   brand : the brand / advertiser the case study is about
-- Run in: Supabase Dashboard → SQL Editor → New query (paste all, Run)
-- Safe to run on the EXISTING database. Idempotent (re-runnable).
-- ============================================================

alter table public.content add column if not exists brand text;

-- Done. New column: content.brand
