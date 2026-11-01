-- ============================================================================
-- migration_v24_engagement.sql — Tương tác & hành trình học (không có quiz)
--   1) learner_activity : ghi nhận concept đã khám phá + ngày hoạt động (streak)
--   2) my_progress      : tiến độ của 1 trình duyệt (anon_id) -> huy hiệu, streak,
--                         hành trình Origin → Expansion → Mastery
--   3) content_reactions: 💡 Insightful / 🤔 Debatable / 🔥 Inspiring cho case study
--   4) discussion_answers.is_best : giảng viên ghim "câu trả lời hay nhất"
--   5) recent_activity / public_site_stats : dòng hoạt động & số liệu công khai
--      (chỉ trả về tiêu đề + con số, KHÔNG lộ anon_id / tên / email)
--
-- Chạy trong: Supabase Dashboard > SQL Editor > New query. An toàn khi chạy lại.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) learner_activity
-- ---------------------------------------------------------------------------
create table if not exists public.learner_activity (
  id         bigserial primary key,
  anon_id    text not null,
  kind       text not null check (kind in ('concept', 'visit', 'post')),
  target_id  uuid,
  day        date not null default ((now() at time zone 'Asia/Ho_Chi_Minh')::date),
  created_at timestamptz not null default now()
);
-- 1 bản ghi / người / loại / mục / ngày
create unique index if not exists learner_activity_uniq
  on public.learner_activity (anon_id, kind, coalesce(target_id, '00000000-0000-0000-0000-000000000000'::uuid), day);
create index if not exists learner_activity_anon_idx on public.learner_activity (anon_id, day desc);

alter table public.learner_activity enable row level security;
-- Không mở policy trực tiếp; chỉ đi qua RPC.

create or replace function public.record_activity(p_anon_id text, p_kind text, p_target_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_anon_id is null or length(trim(p_anon_id)) = 0
     or p_kind not in ('concept', 'visit', 'post') then
    return;
  end if;
  insert into public.learner_activity (anon_id, kind, target_id)
  values (left(p_anon_id, 64), p_kind, p_target_id)
  on conflict do nothing;
end;
$$;
grant execute on function public.record_activity(text, text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) content_reactions (tạo trước để my_progress tham chiếu được)
-- ---------------------------------------------------------------------------
create table if not exists public.content_reactions (
  id          bigserial primary key,
  content_id  uuid not null references public.content(id) on delete cascade,
  anon_id     text not null,
  reaction    text not null check (reaction in ('insight', 'debate', 'fire')),
  created_at  timestamptz not null default now(),
  unique (content_id, anon_id, reaction)
);
create index if not exists content_reactions_content_idx on public.content_reactions (content_id);
alter table public.content_reactions enable row level security;

create or replace function public.toggle_reaction(p_content_id uuid, p_reaction text, p_anon_id text)
returns table(reaction text, reaction_count integer, reacted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  if p_content_id is null or p_anon_id is null or length(trim(p_anon_id)) = 0
     or p_reaction not in ('insight', 'debate', 'fire') then
    return;
  end if;
  delete from public.content_reactions r
  where r.content_id = p_content_id and r.anon_id = p_anon_id and r.reaction = p_reaction;
  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    begin
      insert into public.content_reactions (content_id, anon_id, reaction)
      values (p_content_id, left(p_anon_id, 64), p_reaction)
      on conflict do nothing;
    exception when foreign_key_violation then
      return;
    end;
    reacted := true;
  else
    reacted := false;
  end if;
  reaction := p_reaction;
  select count(*)::int into reaction_count
  from public.content_reactions r
  where r.content_id = p_content_id and r.reaction = p_reaction;
  return next;
end;
$$;

create or replace function public.get_reactions(p_content_ids uuid[], p_anon_id text default null)
returns table(content_id uuid, reaction text, reaction_count integer, reacted boolean)
language sql
security definer
set search_path = public
stable
as $$
  select r.content_id, r.reaction, count(*)::int, bool_or(r.anon_id = p_anon_id)
  from public.content_reactions r
  where r.content_id = any(coalesce(p_content_ids, '{}'))
  group by r.content_id, r.reaction;
$$;

grant execute on function public.toggle_reaction(uuid, text, text) to anon, authenticated;
grant execute on function public.get_reactions(uuid[], text)       to anon, authenticated;

-- Cột dùng cho mục 4 (tạo sớm vì my_progress tham chiếu)
alter table public.discussion_answers add column if not exists is_best boolean not null default false;

-- ---------------------------------------------------------------------------
-- 2) my_progress — mọi con số của chính người gọi (theo anon_id)
-- ---------------------------------------------------------------------------
create or replace function public.my_progress(p_anon_id text)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'cases_viewed',      (select count(distinct v.content_id) from public.content_views v where v.anon_id = p_anon_id),
    'concepts_explored', (select count(distinct a.target_id) from public.learner_activity a where a.anon_id = p_anon_id and a.kind = 'concept'),
    'hearts_given',      (select count(*) from public.hearts h where h.anon_id = p_anon_id),
    'reactions_given',   (select count(*) from public.content_reactions r where r.anon_id = p_anon_id),
    'questions',         (select count(*) from public.discussion_questions q where q.anon_id = p_anon_id),
    'answers',           (select count(*) from public.discussion_answers d where d.anon_id = p_anon_id),
    'best_answers',      (select count(*) from public.discussion_answers d where d.anon_id = p_anon_id and d.is_best),
    'days', coalesce((
      select json_agg(d order by d desc) from (
        select distinct d from (
          select v.view_date as d from public.content_views v where v.anon_id = p_anon_id
          union select a.day from public.learner_activity a where a.anon_id = p_anon_id
          union select (h.created_at at time zone 'Asia/Ho_Chi_Minh')::date from public.hearts h where h.anon_id = p_anon_id
          union select (r.created_at at time zone 'Asia/Ho_Chi_Minh')::date from public.content_reactions r where r.anon_id = p_anon_id
          union select (q.created_at at time zone 'Asia/Ho_Chi_Minh')::date from public.discussion_questions q where q.anon_id = p_anon_id
          union select (x.created_at at time zone 'Asia/Ho_Chi_Minh')::date from public.discussion_answers x where x.anon_id = p_anon_id
        ) u
        where d > ((now() at time zone 'Asia/Ho_Chi_Minh')::date - 400)
      ) s
    ), '[]'::json),
    'today', ((now() at time zone 'Asia/Ho_Chi_Minh')::date)
  );
$$;

-- ---------------------------------------------------------------------------
-- 4) Câu trả lời hay nhất (giảng viên/admin ghim)
-- ---------------------------------------------------------------------------

drop policy if exists da_admin_update on public.discussion_answers;
create policy da_admin_update
  on public.discussion_answers for update
  to authenticated
  using ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' );

grant execute on function public.my_progress(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Dòng hoạt động & số liệu công khai (ẩn danh hoàn toàn)
-- ---------------------------------------------------------------------------
create or replace function public.recent_activity(p_limit integer default 12)
returns table(kind text, content_id uuid, content_kind text, title text, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select * from (
    select 'heart'::text, c.id, c.kind::text, c.title, h.created_at
    from public.hearts h join public.content c on c.id = h.target_id
    where h.target_type = 'content' and c.published
    union all
    select r.reaction, c.id, c.kind::text, c.title, r.created_at
    from public.content_reactions r join public.content c on c.id = r.content_id
    where c.published
    union all
    select 'view'::text, c.id, c.kind::text, c.title, v.created_at
    from public.content_views v join public.content c on c.id = v.content_id
    where c.published
    union all
    select 'question'::text, null::uuid, null::text, q.title, q.created_at
    from public.discussion_questions q
  ) t
  order by 5 desc
  limit least(greatest(coalesce(p_limit, 12), 1), 30);
$$;

create or replace function public.public_site_stats()
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'views',     (select count(*) from public.content_views),
    'hearts',    (select count(*) from public.hearts),
    'reactions', (select count(*) from public.content_reactions),
    'questions', (select count(*) from public.discussion_questions),
    'answers',   (select count(*) from public.discussion_answers)
  );
$$;

grant execute on function public.recent_activity(integer) to anon, authenticated;
grant execute on function public.public_site_stats()      to anon, authenticated;
