-- ============================================================
-- Knoworld — Remove the sample "Theoretical Foundations"
-- Run in: Supabase Dashboard > SQL Editor > New query (paste, Run)
-- Safe & idempotent. Deletes ONLY the 5 starter foundation rows
-- so any real content / case studies you added are untouched.
-- ============================================================
delete from public.content
where is_foundation = true
  and title in (
    'Integrated Marketing Communications (IMC)',
    'Brand Equity (Keller''s CBBE Pyramid)',
    'STP — Segmentation, Targeting, Positioning',
    'The Marketing Mix (4Ps / 7Ps)',
    'Consumer Decision Journey'
  );

-- Optional: if you want to wipe ALL foundations (not just the samples),
-- uncomment the next line instead:
-- delete from public.content where is_foundation = true;
