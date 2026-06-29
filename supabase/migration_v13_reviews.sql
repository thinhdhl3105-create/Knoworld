-- ============================================================================
-- migration_v13_reviews.sql
-- Site reviews (đánh giá website) cho khách KHÔNG cần đăng nhập.
-- Khách (anon) được INSERT đánh giá; chỉ admin được đọc.
-- Chạy trong: Supabase Dashboard > SQL Editor > New query. An toàn chạy lại nhiều lần.
-- ============================================================================

create table if not exists public.site_reviews (
  id                  uuid primary key default gen_random_uuid(),
  anon_id             text,                       -- id ẩn danh lưu ở localStorage trình duyệt
  rating_convenience  smallint not null check (rating_convenience between 1 and 5), -- Sự tiện lợi
  rating_content      smallint not null check (rating_content    between 1 and 5),  -- Nội dung
  rating_overall      smallint not null check (rating_overall    between 1 and 5),  -- Tổng quan
  comment             text,                       -- Góp ý thêm (tùy chọn)
  page_path           text,                       -- Trang lúc gửi đánh giá
  user_agent          text,                       -- Thông tin trình duyệt (tham khảo)
  created_at          timestamptz not null default now()
);

create index if not exists site_reviews_created_at_idx on public.site_reviews (created_at desc);
create index if not exists site_reviews_anon_idx       on public.site_reviews (anon_id);

alter table public.site_reviews enable row level security;

-- --- Policies ---------------------------------------------------------------
-- INSERT: bất kỳ ai (kể cả khách chưa đăng nhập) đều gửi được đánh giá.
drop policy if exists site_reviews_insert on public.site_reviews;
create policy site_reviews_insert
  on public.site_reviews
  for insert
  to anon, authenticated
  with check (true);

-- SELECT: chỉ tài khoản admin mới xem được danh sách đánh giá.
-- Đổi email bên dưới nếu tài khoản admin thay đổi.
drop policy if exists site_reviews_admin_read on public.site_reviews;
create policy site_reviews_admin_read
  on public.site_reviews
  for select
  to authenticated
  using ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' );

-- (Không cấp UPDATE/DELETE cho ai — đánh giá là bất biến.)
