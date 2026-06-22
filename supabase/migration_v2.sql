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
-- 4. CLEAN OUT THE OLD PLACEHOLDER / SAMPLE CONTENT
--    Removes the fictional seed rows so you can start fresh.
--    (Deletes ALL existing content rows — run only if that's intended.)
-- ============================================================
delete from public.content;

-- ============================================================
-- 5. SEED — real Theoretical Foundations (editable later in the dashboard)
--    These are starter entries for the Research Archive > Theoretical
--    Foundations section. Edit / add / delete them freely after deploy.
-- ============================================================
insert into public.content (kind, title, summary, body, category, tags, is_foundation, published) values
  ('research',
   'Integrated Marketing Communications (IMC)',
   'A planning approach that aligns every brand message — advertising, PR, digital, promotion — into one consistent voice across all touchpoints.',
   'IMC argues that the audience experiences a brand as a single entity, so all communication disciplines must be coordinated around shared objectives, a unified positioning, and a consistent message architecture. Core ideas: start from the customer and work back (outside-in planning), measure on outcomes (behaviour, not just awareness), and orchestrate paid, owned and earned channels around one big idea.',
   'Theoretical Foundation', array['imc','planning','foundation'], true, true),

  ('research',
   'Brand Equity (Keller''s CBBE Pyramid)',
   'Customer-Based Brand Equity model: brand value is built bottom-up through Salience, Performance & Imagery, Judgements & Feelings, and finally Resonance.',
   'Keller''s pyramid frames brand building as four ascending stages answering four customer questions: Who are you? (salience), What are you? (performance + imagery), What about you? (judgements + feelings), and What about you and me? (resonance / loyalty). Strong brands move customers up the pyramid toward active, self-expressive loyalty.',
   'Theoretical Foundation', array['branding','equity','foundation'], true, true),

  ('research',
   'STP — Segmentation, Targeting, Positioning',
   'The strategic backbone of marketing: divide the market, choose where to compete, and own a distinct position in the customer''s mind.',
   'Segmentation groups the market by needs, behaviour or demographics; targeting selects the most attractive and winnable segments; positioning defines the differentiated value and frame of reference you want to own. STP turns a broad market into a focused strategy and is the bridge between insight and the marketing mix.',
   'Theoretical Foundation', array['strategy','positioning','foundation'], true, true),

  ('research',
   'The Marketing Mix (4Ps / 7Ps)',
   'The controllable levers — Product, Price, Place, Promotion (plus People, Process, Physical evidence for services) — used to execute a positioning.',
   'The mix translates strategy into action. The classic 4Ps cover the core offer and how it reaches the market; the extended 7Ps add the service dimensions that shape experience. A coherent mix is internally consistent and reinforces the chosen positioning at every point.',
   'Theoretical Foundation', array['mix','4ps','foundation'], true, true),

  ('research',
   'Consumer Decision Journey',
   'A non-linear model of how people move from trigger and consideration to purchase, experience, and an ongoing loyalty loop.',
   'Unlike the old linear funnel, the modern journey is a loop: an initial trigger opens a consideration set, active evaluation can add or remove brands, and the post-purchase experience feeds a loyalty loop that can shortcut future decisions. Mapping the journey reveals the moments that matter and where communication should intervene.',
   'Theoretical Foundation', array['consumer','journey','foundation'], true, true)
on conflict do nothing;

-- Done. Review the new tables under Table Editor: content, concepts, concept_links, frameworks.
