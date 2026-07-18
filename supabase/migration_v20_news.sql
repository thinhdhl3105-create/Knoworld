-- ============================================================================
-- migration_v20_news.sql
-- NEWS — cập nhật thông tin thị trường (crisis, market update, trend…).
-- Ai cũng ĐỌC được (kể cả khách chưa đăng nhập). Chỉ ADMIN được thêm/xoá.
-- Admin thêm tin bằng: link bài báo (url) + tiêu đề (title) + năm (year) + nhãn.
--
-- Chạy trong: Supabase Dashboard > SQL Editor > New query.
-- An toàn khi chạy lại nhiều lần (idempotent).
-- ============================================================================

create table if not exists public.news_items (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,                        -- Tiêu đề bài báo
  url         text not null,                        -- Đường link website bài báo
  year        smallint,                             -- Năm của tin (vd 2026)
  category    text not null default 'general'
              check (category in ('crisis', 'market', 'trend', 'regulation', 'general')),
  summary     text,                                 -- Mô tả ngắn (tùy chọn)
  created_by  text,                                 -- Email admin đã thêm (tham khảo)
  created_at  timestamptz not null default now()
);

create index if not exists news_items_created_idx  on public.news_items (created_at desc);
create index if not exists news_items_category_idx on public.news_items (category);
create index if not exists news_items_year_idx     on public.news_items (year desc);

alter table public.news_items enable row level security;

-- --- Policies ---------------------------------------------------------------
-- SELECT: mọi người (kể cả khách chưa đăng nhập) đều xem được tin.
drop policy if exists news_read_all on public.news_items;
create policy news_read_all
  on public.news_items
  for select
  using (true);

-- INSERT: chỉ tài khoản admin mới thêm được tin.
-- Đổi email bên dưới nếu tài khoản admin thay đổi.
drop policy if exists news_admin_insert on public.news_items;
create policy news_admin_insert
  on public.news_items
  for insert
  to authenticated
  with check ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' );

-- UPDATE: chỉ admin được sửa tin.
drop policy if exists news_admin_update on public.news_items;
create policy news_admin_update
  on public.news_items
  for update
  to authenticated
  using ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' );

-- DELETE: chỉ admin được xoá tin.
drop policy if exists news_admin_delete on public.news_items;
create policy news_admin_delete
  on public.news_items
  for delete
  to authenticated
  using ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' );
