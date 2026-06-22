-- ============================================================
-- Knoworld — Supabase Schema (full, for a FRESH project)
-- Run in: Supabase Dashboard > SQL Editor > New query
-- If your DB already exists from an earlier version, run
-- migration_v2.sql instead (it only applies the deltas).
-- ============================================================

-- 0. Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. PROFILES (1-1 with auth.users)
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- shared updated_at trigger fn
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- 2. CONCEPTS (Knowledge Hub key concepts)  + links (node graph)
--    Defined before content so content.concept_id FK resolves.
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
drop policy if exists "Concepts readable by all"   on public.concepts;
drop policy if exists "Auth can insert concepts"    on public.concepts;
drop policy if exists "Authors update own concepts" on public.concepts;
drop policy if exists "Authors delete own concepts" on public.concepts;
create policy "Concepts readable by all"
  on public.concepts for select using (published = true or auth.uid() = author_id);
create policy "Auth can insert concepts"
  on public.concepts for insert with check (auth.uid() = author_id);
create policy "Authors update own concepts"
  on public.concepts for update using (auth.uid() = author_id);
create policy "Authors delete own concepts"
  on public.concepts for delete using (auth.uid() = author_id);

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
drop policy if exists "Links readable by all"   on public.concept_links;
drop policy if exists "Auth can insert links"    on public.concept_links;
drop policy if exists "Authors delete own links" on public.concept_links;
create policy "Links readable by all"
  on public.concept_links for select using (true);
create policy "Auth can insert links"
  on public.concept_links for insert with check (auth.uid() = author_id);
create policy "Authors delete own links"
  on public.concept_links for delete using (auth.uid() = author_id);

-- ============================================================
-- 3. CONTENT (research / student / video / note)
-- ============================================================
do $$ begin
  create type public.content_kind as enum ('research', 'student', 'video', 'note');
exception when duplicate_object then null; end $$;

create table if not exists public.content (
  id                uuid primary key default gen_random_uuid(),
  kind              public.content_kind not null default 'note',
  title             text not null,
  summary           text,
  body              text,
  category          text,
  tags              text[] default '{}',
  cover_url         text,
  media_url         text,
  -- research
  paper_url         text,
  source_url        text,
  is_foundation     boolean not null default false,
  -- student case study
  context           text,
  insight           text,
  creative_approach text,
  execution         text,
  images            text[] default '{}',
  -- brand (video + student case studies)
  brand             text,
  -- video → knowledge hub concept
  concept_id        uuid references public.concepts(id) on delete set null,
  author_id         uuid references auth.users(id) on delete set null,
  published         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists content_kind_idx       on public.content (kind);
create index if not exists content_created_at_idx on public.content (created_at desc);
create index if not exists content_category_idx   on public.content (category);
create index if not exists content_foundation_idx on public.content (is_foundation);

drop trigger if exists content_set_updated_at on public.content;
create trigger content_set_updated_at
  before update on public.content
  for each row execute function public.set_updated_at();

alter table public.content enable row level security;

drop policy if exists "Published content readable by all" on public.content;
drop policy if exists "Authenticated can insert content" on public.content;
drop policy if exists "Authors can update own content"   on public.content;
drop policy if exists "Authors can delete own content"   on public.content;

create policy "Published content readable by all"
  on public.content for select
  using (published = true or auth.uid() = author_id);
create policy "Authenticated can insert content"
  on public.content for insert
  with check (auth.uid() = author_id);
create policy "Authors can update own content"
  on public.content for update
  using (auth.uid() = author_id);
create policy "Authors can delete own content"
  on public.content for delete
  using (auth.uid() = author_id);

-- ------------------------------------------------------------
-- 3b. FOUNDATION_LINKS — Theoretical Map edges
--     Foundation (content.is_foundation=true) ↔ Research (content)
-- ------------------------------------------------------------
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
drop policy if exists "Foundation links readable by all"    on public.foundation_links;
drop policy if exists "Auth can insert foundation links"     on public.foundation_links;
drop policy if exists "Authors update own foundation links"  on public.foundation_links;
drop policy if exists "Authors delete own foundation links"  on public.foundation_links;
create policy "Foundation links readable by all"
  on public.foundation_links for select using (true);
create policy "Auth can insert foundation links"
  on public.foundation_links for insert with check (auth.uid() = author_id);
create policy "Authors update own foundation links"
  on public.foundation_links for update using (auth.uid() = author_id);
create policy "Authors delete own foundation links"
  on public.foundation_links for delete using (auth.uid() = author_id);

-- ============================================================
-- 4. FRAMEWORKS (downloadable templates + guide page)
-- ============================================================
create table if not exists public.frameworks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  summary     text,
  body        text,
  category    text,
  tags        text[] default '{}',
  file_url    text,
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
-- 5. STORAGE bucket for uploads (images / video / files)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

drop policy if exists "Public read uploads"  on storage.objects;
drop policy if exists "Auth upload uploads"   on storage.objects;
drop policy if exists "Owner update uploads"  on storage.objects;
drop policy if exists "Owner delete uploads"  on storage.objects;

create policy "Public read uploads"
  on storage.objects for select using (bucket_id = 'uploads');
create policy "Auth upload uploads"
  on storage.objects for insert
  with check (bucket_id = 'uploads' and auth.role() = 'authenticated');
create policy "Owner update uploads"
  on storage.objects for update
  using (bucket_id = 'uploads' and owner = auth.uid());
create policy "Owner delete uploads"
  on storage.objects for delete
  using (bucket_id = 'uploads' and owner = auth.uid());

-- ============================================================
-- 6. SEED — (intentionally empty)
--    No starter Theoretical Foundations are inserted. The platform
--    starts empty; add your own from the dashboard
--    (Upload > Research / Foundation > tick "Theoretical Foundation").
-- ============================================================
-- (no seed rows)
