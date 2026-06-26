-- ============================================================
-- Knoworld — Migration v9
-- Adds an ordered list of STEPS to frameworks.
--
--   steps  jsonb  — array of { title, body } objects, in order.
--                   Lets a contributor define a step-by-step guide
--                   for a category (IMC Campaign, Branding,
--                   Marketing Strategy…) that students can follow.
--
-- Example value:
--   [
--     { "title": "Situation analysis", "body": "Audit the brand, market and competitors…" },
--     { "title": "Define objectives",  "body": "Set SMART communication objectives…" }
--   ]
--
-- Run in: Supabase Dashboard → SQL Editor → New query (paste all, Run)
-- Safe to run on the EXISTING database. Idempotent (re-runnable).
-- ============================================================

alter table public.frameworks
  add column if not exists steps jsonb not null default '[]'::jsonb;

-- (Optional) sanity check:
-- select id, title, category, jsonb_array_length(steps) as step_count from public.frameworks;
