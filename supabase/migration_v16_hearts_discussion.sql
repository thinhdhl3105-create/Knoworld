-- ============================================================================
-- migration_v16_hearts_discussion.sql
-- Thêm 2 tính năng:
--   1) THẢ TIM cho video case study / student case study (bảng hearts)
--   2) DISCUSSION — sinh viên đặt câu hỏi, mọi người trả lời,
--      chọn hiển thị tên hoặc Anonymous, thả tim cho câu hỏi & câu trả lời.
--
-- Chạy trong: Supabase Dashboard > SQL Editor > New query.
-- An toàn khi chạy lại nhiều lần (idempotent).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) HEARTS — 1 người (anon_id trình duyệt) chỉ tim 1 lần / 1 mục, bấm lại để bỏ.
--    target_type: 'content' (video/student case study) | 'question' | 'answer'
-- ---------------------------------------------------------------------------
create table if not exists public.hearts (
  id          uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('content', 'question', 'answer')),
  target_id   uuid not null,
  anon_id     text not null,
  created_at  timestamptz not null default now(),
  unique (target_type, target_id, anon_id)
);
create index if not exists hearts_target_idx on public.hearts (target_type, target_id);

alter table public.hearts enable row level security;
-- Không mở policy trực tiếp cho anon — mọi thao tác đi qua RPC SECURITY DEFINER.
drop policy if exists hearts_admin_read on public.hearts;
create policy hearts_admin_read
  on public.hearts for select
  to authenticated
  using ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' );

-- RPC: bật/tắt tim. Trả về số tim mới + trạng thái đã tim của người gọi.
create or replace function public.toggle_heart(p_target_type text, p_target_id uuid, p_anon_id text)
returns table(heart_count integer, hearted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  if p_anon_id is null or length(trim(p_anon_id)) = 0
     or p_target_id is null
     or p_target_type not in ('content', 'question', 'answer') then
    return;
  end if;

  delete from public.hearts h
  where h.target_type = p_target_type and h.target_id = p_target_id and h.anon_id = p_anon_id;
  get diagnostics v_deleted = row_count;

  if v_deleted = 0 then
    insert into public.hearts (target_type, target_id, anon_id)
    values (p_target_type, p_target_id, p_anon_id)
    on conflict do nothing;
    hearted := true;
  else
    hearted := false;
  end if;

  select count(*)::int into heart_count
  from public.hearts h
  where h.target_type = p_target_type and h.target_id = p_target_id;

  return next;
end;
$$;

-- RPC: lấy số tim (và đã tim chưa) cho 1 loạt mục — gọi 1 lần cho cả trang.
create or replace function public.get_hearts(p_target_type text, p_target_ids uuid[], p_anon_id text default null)
returns table(target_id uuid, heart_count integer, hearted boolean)
language sql
security definer
set search_path = public
stable
as $$
  select
    t.id as target_id,
    count(h.id)::int as heart_count,
    bool_or(h.anon_id = p_anon_id) as hearted
  from unnest(coalesce(p_target_ids, '{}')) as t(id)
  left join public.hearts h
    on h.target_type = p_target_type and h.target_id = t.id
  group by t.id;
$$;

grant execute on function public.toggle_heart(text, uuid, text)        to anon, authenticated;
grant execute on function public.get_hearts(text, uuid[], text)        to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) DISCUSSION — câu hỏi & câu trả lời
-- ---------------------------------------------------------------------------
create table if not exists public.discussion_questions (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text,
  anon_id      text,                      -- id trình duyệt (để xoá bài của mình)
  author_name  text,                      -- tên hiển thị (null nếu ẩn danh)
  author_email text,                      -- chỉ admin đọc được qua bảng, không hiển thị công khai
  is_anonymous boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists discussion_questions_created_idx on public.discussion_questions (created_at desc);

create table if not exists public.discussion_answers (
  id           uuid primary key default gen_random_uuid(),
  question_id  uuid not null references public.discussion_questions(id) on delete cascade,
  body         text not null,
  anon_id      text,
  author_name  text,
  author_email text,
  is_anonymous boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists discussion_answers_question_idx on public.discussion_answers (question_id, created_at);

alter table public.discussion_questions enable row level security;
alter table public.discussion_answers   enable row level security;

-- Ai cũng đọc được (kể cả khách chưa đăng nhập).
drop policy if exists dq_read_all on public.discussion_questions;
create policy dq_read_all on public.discussion_questions for select using (true);
drop policy if exists da_read_all on public.discussion_answers;
create policy da_read_all on public.discussion_answers for select using (true);

-- Ai cũng đăng được (khách đã qua cổng đăng ký của web).
drop policy if exists dq_insert_all on public.discussion_questions;
create policy dq_insert_all on public.discussion_questions for insert to anon, authenticated with check (true);
drop policy if exists da_insert_all on public.discussion_answers;
create policy da_insert_all on public.discussion_answers for insert to anon, authenticated with check (true);

-- Admin xoá được mọi bài.
drop policy if exists dq_admin_delete on public.discussion_questions;
create policy dq_admin_delete
  on public.discussion_questions for delete
  to authenticated
  using ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' );
drop policy if exists da_admin_delete on public.discussion_answers;
create policy da_admin_delete
  on public.discussion_answers for delete
  to authenticated
  using ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' );

-- RPC: tự xoá bài của chính mình (khớp anon_id trình duyệt).
create or replace function public.delete_own_question(p_id uuid, p_anon_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  if p_id is null or p_anon_id is null or length(trim(p_anon_id)) = 0 then
    return false;
  end if;
  delete from public.discussion_questions q where q.id = p_id and q.anon_id = p_anon_id;
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

create or replace function public.delete_own_answer(p_id uuid, p_anon_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  if p_id is null or p_anon_id is null or length(trim(p_anon_id)) = 0 then
    return false;
  end if;
  delete from public.discussion_answers a where a.id = p_id and a.anon_id = p_anon_id;
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

grant execute on function public.delete_own_question(uuid, text) to anon, authenticated;
grant execute on function public.delete_own_answer(uuid, text)   to anon, authenticated;
