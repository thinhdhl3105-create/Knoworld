-- ============================================================================
-- migration_v14_visitors.sql
-- Cổng đăng ký (visitor gate): khách phải điền thông tin trước khi vào web.
--   -> bảng public.site_visitors
-- Gắn danh tính người xem vào đánh giá:
--   -> thêm cột visitor_* vào public.site_reviews
--
-- Khách (anon) được INSERT; chỉ admin được đọc.
-- Chạy trong: Supabase Dashboard > SQL Editor > New query.
-- An toàn khi chạy lại nhiều lần (idempotent).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Bảng người ra vào (ai đăng ký vào web)
-- ---------------------------------------------------------------------------
create table if not exists public.site_visitors (
  id           uuid primary key default gen_random_uuid(),
  anon_id      text,                       -- id ẩn danh lưu ở localStorage trình duyệt
  full_name    text not null,              -- Họ tên
  email        text not null,              -- Email
  birth_year   smallint,                   -- Năm sinh
  field        text,                       -- Lĩnh vực muốn tìm hiểu: IMC, Creative, Branding...
  page_path    text,                       -- Trang lúc đăng ký
  user_agent   text,                       -- Thông tin trình duyệt (tham khảo)
  created_at   timestamptz not null default now()
);

create index if not exists site_visitors_created_at_idx on public.site_visitors (created_at desc);
create index if not exists site_visitors_anon_idx       on public.site_visitors (anon_id);
create index if not exists site_visitors_email_idx      on public.site_visitors (email);

alter table public.site_visitors enable row level security;

-- INSERT: bất kỳ ai (kể cả khách chưa đăng nhập) đều đăng ký được.
drop policy if exists site_visitors_insert on public.site_visitors;
create policy site_visitors_insert
  on public.site_visitors
  for insert
  to anon, authenticated
  with check (true);

-- SELECT: chỉ tài khoản admin mới xem được danh sách người ra vào.
-- Đổi email bên dưới nếu tài khoản admin thay đổi.
drop policy if exists site_visitors_admin_read on public.site_visitors;
create policy site_visitors_admin_read
  on public.site_visitors
  for select
  to authenticated
  using ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' );

-- ---------------------------------------------------------------------------
-- 2) Gắn danh tính người xem vào đánh giá (link visitor <-> review)
--    Lưu denormalized để admin xem nhanh, không cần join.
-- ---------------------------------------------------------------------------
alter table public.site_reviews
  add column if not exists visitor_id         uuid references public.site_visitors(id) on delete set null,
  add column if not exists visitor_name       text,
  add column if not exists visitor_email      text,
  add column if not exists visitor_field      text,
  add column if not exists visitor_birth_year smallint;

create index if not exists site_reviews_visitor_idx on public.site_reviews (visitor_id);

-- ---------------------------------------------------------------------------
-- 3) (Tuỳ chọn) Xem nhanh: mỗi người + đánh giá gần nhất của họ.
-- ---------------------------------------------------------------------------
create or replace view public.visitor_reviews as
  select
    v.id            as visitor_id,
    v.full_name,
    v.email,
    v.birth_year,
    v.field,
    v.created_at    as registered_at,
    r.rating_convenience,
    r.rating_content,
    r.rating_overall,
    r.comment,
    r.created_at    as reviewed_at
  from public.site_visitors v
  left join public.site_reviews r on r.visitor_id = v.id;
