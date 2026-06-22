-- ============================================================
-- Knoworld — Migration v2
-- Run in: Supabase Dashboard > SQL Editor > New query (paste all, Run)
-- Safe to run on the EXISTING database created by schema.sql.
-- Idempotent: can be run more than once.
-- ============================================================

-- 0. Extensions ------------------------------------------------
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. EXTEND public.content
--    - Research:  paper_url (downloadable PDF), is_foundation flag
--    - Student :  context / insight / creative_approach / execution / images[]
--    - Video   :  concept_id link to a knowledge-hub concept
-- ============================================================
alter table public.content add column if not exists paper_url        text;
alter table public.content add column if not exists is_foundation    boolean not null default false;
alter table public.content add column if not exists context          text;
alter table public.content add column if not exists insight          text;
alter table public.content add column if not exists creative_approach text;
alter table public.content add column if not exists execution        text;
alter table public.content add column if not exists images           text[] default '{}';
alter table public.content add column if not exists concept_id       uuid;

create index if not exists content_foundation_idx on public.content (is_foundation);

-- ============================================================
-- 2. KNOWLEDGE HUB — concepts + links (node graph)
-- ============================================================
create table if not exists public.concepts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  summary     text,
  body        text,
  category    text,
  tags        text[] default '{}',
  color       text,
  author_id   uuid references auth.users(id) on delete set null,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists concepts_category_idx on public.concepts (category);

drop trigger if exists concepts_set_updated_at on public.concepts;
create trigger concepts_set_updated_at
  before update on public.concepts
  for each row execute function public.set_updated_at();

alter table public.concepts enable row level security;

drop policy if exists "Concepts readable by all"        on public.concepts;
drop policy if exists "Auth can insert concepts"         on public.concepts;
drop policy if exists "Authors update own concepts"      on public.concepts;
drop policy if exists "Authors delete own concepts"      on public.concepts;

create policy "Concepts readable by all"
  on public.concepts for select using (published = true or auth.uid() = author_id);
create policy "Auth can insert concepts"
  on public.concepts for insert with check (auth.uid() = author_id);
create policy "Authors update own concepts"
  on public.concepts for update using (auth.uid() = author_id);
create policy "Authors delete own concepts"
  on public.concepts for delete using (auth.uid() = author_id);

-- Edges between concepts (manual links)
create table if not exists public.concept_links (
  id          uuid primary key default gen_random_uuid(),
  source_id   uuid not null references public.concepts(id) on delete cascade,
  target_id   uuid not null references public.concepts(id) on delete cascade,
  label       text,
  author_id   uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists concept_links_source_idx on public.concept_links (source_id);
create index if not exists concept_links_target_idx on public.concept_links (target_id);

alter table public.concept_links enable row level security;

drop policy if exists "Links readable by all"       on public.concept_links;
drop policy if exists "Auth can insert links"        on public.concept_links;
drop policy if exists "Authors delete own links"     on public.concept_links;

create policy "Links readable by all"
  on public.concept_links for select using (true);
create policy "Auth can insert links"
  on public.concept_links for insert with check (auth.uid() = author_id);
create policy "Authors delete own links"
  on public.concept_links for delete using (auth.uid() = author_id);

-- Now that concepts exists, wire the FK from content.concept_id
do $$ begin
  alter table public.content
    add constraint content_concept_fk
    foreign key (concept_id) references public.concepts(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ============================================================
-- 3. FRAMEWORKS (downloadable templates + guide page)
-- ============================================================
create table if not exists public.frameworks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  summary     text,
  body        text,                -- guide / description page (markdown-ish text)
  category    text,
  tags        text[] default '{}',
  file_url    text,                -- downloadable file (PDF/DOCX/PPTX/XLSX)
  file_name   text,
  cover_url   text,
  author_id   uuid references auth.users(id) on delete set null,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists frameworks_category_idx on public.frameworks (category);

drop trigger if exists frameworks_set_updated_at on public.frameworks;
create trigger frameworks_set_updated_at
  before update on public.frameworks
  for each row execute function public.set_updated_at();

alter table public.frameworks enable row level security;

drop policy if exists "Frameworks readable by all"   on public.frameworks;
drop policy if exists "Auth can insert frameworks"    on public.frameworks;
drop policy if exists "Authors update own frameworks" on public.frameworks;
drop policy if exists "Authors delete own frameworks" on public.frameworks;

create policy "Frameworks readable by all"
  on public.frameworks for select using (published = true or auth.uid() = author_id);
create policy "Auth can insert frameworks"
  on public.frameworks for insert with check (auth.uid() = author_id);
create policy "Authors update own frameworks"
  on public.frameworks for update using (auth.uid() = author_id);
create policy "Authors delete own frameworks"
  on public.frameworks for delete using (auth.uid() = author_id);

-- ============================================================
-- 4. REMOVE THE SAMPLE "Theoretical Foundations"
--    Deletes ONLY the 5 starter foundation rows (by title) so your
--    real content/case studies are left untouched. Add your own
--    foundations later from the dashboard.
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

-- ============================================================
-- 5. SEED — (intentionally empty)
--    No starter foundations are inserted.
-- ============================================================
-- (no seed rows)

-- Done. Review the tables under Table Editor: content, concepts, concept_links, frameworks.
