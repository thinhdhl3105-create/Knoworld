-- ============================================================================
-- migration_v22_views_reviews.sql
--   1) LƯỢT XEM theo từng nội dung (video / image / student case study)
--      -> Dashboard hiện "Most viewed".
--      Một trình duyệt (anon_id) xem lại cùng nội dung trong cùng 1 ngày = 1 lượt.
--   2) ĐÁNH GIÁ WEB bắt buộc có ghi chú (tối thiểu 10 ký tự).
--      Áp dụng cho đánh giá MỚI; đánh giá cũ không có ghi chú vẫn giữ nguyên.
--
-- Chạy trong: Supabase Dashboard > SQL Editor > New query. An toàn khi chạy lại.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Bảng lượt xem
-- ---------------------------------------------------------------------------
create table if not exists public.content_views (
  id          bigserial primary key,
  content_id  uuid not null references public.content(id) on delete cascade,
  kind        text,
  anon_id     text not null,
  view_date   date not null default ((now() at time zone 'Asia/Ho_Chi_Minh')::date),
  created_at  timestamptz not null default now(),
  unique (content_id, anon_id, view_date)
);
create index if not exists content_views_content_idx on public.content_views (content_id);
create index if not exists content_views_date_idx    on public.content_views (view_date desc);

-- Không ai đọc/ghi trực tiếp bảng; chỉ qua 2 RPC bên dưới.
alter table public.content_views enable row level security;

-- Ghi 1 lượt xem (khách ẩn danh gọi được).
create or replace function public.record_content_view(p_content_id uuid, p_kind text, p_anon_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_content_id is null or p_anon_id is null or length(trim(p_anon_id)) = 0 then
    return;
  end if;
  insert into public.content_views (content_id, kind, anon_id)
  values (p_content_id, left(p_kind, 20), left(p_anon_id, 64))
  on conflict (content_id, anon_id, view_date) do nothing;
exception when foreign_key_violation then
  return; -- id không tồn tại -> bỏ qua
end;
$$;

-- Thống kê lượt xem: p_days = null -> toàn bộ thời gian.
-- Chỉ trả về con số (không lộ anon_id).
create or replace function public.content_view_stats(p_days integer default null)
returns table(content_id uuid, kind text, views integer, viewers integer, last_viewed timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select v.content_id,
         max(v.kind)                      as kind,
         count(*)::int                    as views,
         count(distinct v.anon_id)::int   as viewers,
         max(v.created_at)                as last_viewed
  from public.content_views v
  where p_days is null
     or v.view_date > ((now() at time zone 'Asia/Ho_Chi_Minh')::date - p_days)
  group by v.content_id;
$$;

grant execute on function public.record_content_view(uuid, text, text) to anon, authenticated;
grant execute on function public.content_view_stats(integer)          to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Ghi chú bắt buộc cho đánh giá web (NOT VALID: không kiểm tra dữ liệu cũ)
-- ---------------------------------------------------------------------------
alter table public.site_reviews drop constraint if exists site_reviews_comment_required;
alter table public.site_reviews
  add constraint site_reviews_comment_required
  check (comment is not null and char_length(btrim(comment)) >= 10) not valid;
