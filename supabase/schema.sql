-- ============================================================
-- Knoworld — Supabase Schema
-- Run in: Supabase Dashboard > SQL Editor > New query
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

-- Auto-create a profile row when a new auth user signs up
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

-- ============================================================
-- 2. CONTENT (research / student / video / note)
-- ============================================================
do $$ begin
  create type public.content_kind as enum ('research', 'student', 'video', 'note');
exception when duplicate_object then null; end $$;

create table if not exists public.content (
  id          uuid primary key default gen_random_uuid(),
  kind        public.content_kind not null default 'note',
  title       text not null,
  summary     text,
  body        text,
  category    text,
  tags        text[] default '{}',
  cover_url   text,
  media_url   text,
  author_id   uuid references auth.users(id) on delete set null,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists content_kind_idx       on public.content (kind);
create index if not exists content_created_at_idx on public.content (created_at desc);
create index if not exists content_category_idx   on public.content (category);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists content_set_updated_at on public.content;
create trigger content_set_updated_at
  before update on public.content
  for each row execute function public.set_updated_at();

alter table public.content enable row level security;

drop policy if exists "Published content readable by all" on public.content;
drop policy if exists "Authenticated can insert content" on public.content;
drop policy if exists "Authors can update own content"   on public.content;
drop policy if exists "Authors can delete own content"   on public.content;

-- Anyone can read published content; authors can read their own drafts
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

-- ============================================================
-- 3. STORAGE bucket for uploads (images / video thumbnails)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

drop policy if exists "Public read uploads"   on storage.objects;
drop policy if exists "Auth upload uploads"    on storage.objects;
drop policy if exists "Owner update uploads"   on storage.objects;
drop policy if exists "Owner delete uploads"   on storage.objects;

create policy "Public read uploads"
  on storage.objects for select
  using (bucket_id = 'uploads');

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
-- 4. Optional seed data (sample content)
-- ============================================================
insert into public.content (kind, title, summary, category, tags, published) values
  ('research', 'Neural Resonances in Multi-Dimensional Data Voids',
   'Exploring how synthetic cognition adapts to non-Euclidean information fields and the emergent patterns therein.',
   'Cognitive Science', array['neural','cognition','featured'], true),
  ('research', 'Synthetic Neural Ethics',
   'Establishing a behavioral framework for autonomous system accountability.',
   'Ethics', array['ethics','ai'], true),
  ('student', 'Biosphere Alpha: Regenerative Urban Habitats',
   'A self-sustaining city model integrating vertical agriculture and closed-loop systems.',
   'Urban Design', array['sustainability','design'], true),
  ('video', 'Quantum Encryption: The Unbreakable Code',
   'A visual breakdown of how quantum key distribution secures tomorrow''s networks.',
   'Strategy Breakdowns', array['quantum','security'], true)
on conflict do nothing;
