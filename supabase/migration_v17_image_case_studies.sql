-- v17 — Image Case Studies
-- Adds a new 'image' value to the content_kind enum so campaigns that are
-- image-only (campaign name + brand + related images) can live in the same
-- `content` table as videos and student case studies.
--
-- Image case studies reuse existing columns: title (campaign name), brand,
-- category, summary, cover_url and images[]. No new columns or policies are
-- required — the existing "published rows are public / authors manage their
-- own" RLS on `content` already covers them.
--
-- Safe to run multiple times (idempotent).

alter type public.content_kind add value if not exists 'image';
