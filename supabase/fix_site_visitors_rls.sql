-- ============================================================================
-- fix_site_visitors_rls.sql  (v2)
-- Sửa lỗi: "new row violates row-level security policy for table site_visitors"
--
-- QUAN TRỌNG: Đừng bôi đen 1 phần. Hãy để CON TRỎ trong ô editor rồi bấm RUN
-- để chạy TOÀN BỘ script này một lần.
-- Chạy trong: Supabase Dashboard > SQL Editor > New query.
-- An toàn khi chạy lại nhiều lần.
-- ============================================================================

-- 1) Bật RLS + cấp quyền INSERT ở mức bảng.
alter table public.site_visitors enable row level security;
grant insert, select on public.site_visitors to anon, authenticated;

-- 2) Xoá mọi policy cũ trên bảng để tránh xung đột.
drop policy if exists site_visitors_insert     on public.site_visitors;
drop policy if exists site_visitors_admin_read  on public.site_visitors;

-- 3) INSERT: cho phép TẤT CẢ (public bao gồm anon + authenticated) đăng ký.
create policy site_visitors_insert
  on public.site_visitors
  for insert
  to public
  with check (true);

-- 4) SELECT: chỉ admin xem danh sách.
create policy site_visitors_admin_read
  on public.site_visitors
  for select
  to authenticated
  using ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' );

-- 5) KIỂM TRA — kết quả bảng này sẽ hiện ở dưới sau khi Run.
--    Gửi lại cho tôi ảnh chụp phần kết quả nếu vẫn lỗi.
select policyname, cmd, roles, with_check
from pg_policies
where schemaname = 'public' and tablename = 'site_visitors'
order by policyname;
