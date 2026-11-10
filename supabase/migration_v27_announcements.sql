-- ============================================================================
-- migration_v27_announcements.sql
-- CITY NOTICE BOARD — bảng thông báo cập nhật trên thành phố (trang chủ).
-- Ai cũng ĐỌC được (kể cả khách). Chỉ ADMIN được đăng / ghim / xoá.
--
-- Chạy trong: Supabase Dashboard > SQL Editor > New query.
-- An toàn khi chạy lại nhiều lần (idempotent).
-- ============================================================================

create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,                       -- Tiêu đề thông báo
  body        text,                                -- Nội dung ngắn (tuỳ chọn)
  tag         text not null default 'update'
              check (tag in ('new', 'update', 'event', 'notice')),
  link        text,                                -- Link nội bộ (/videos) hoặc https://…
  pinned      boolean not null default false,      -- Ghim lên đầu bảng
  created_by  text,                                -- Email admin đã đăng (tham khảo)
  created_at  timestamptz not null default now()
);

create index if not exists announcements_created_idx on public.announcements (pinned desc, created_at desc);

alter table public.announcements enable row level security;

drop policy if exists announcements_read_all on public.announcements;
create policy announcements_read_all
  on public.announcements for select
  using (true);

-- Đổi email bên dưới nếu tài khoản admin thay đổi.
drop policy if exists announcements_admin_insert on public.announcements;
create policy announcements_admin_insert
  on public.announcements for insert to authenticated
  with check ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' );

drop policy if exists announcements_admin_update on public.announcements;
create policy announcements_admin_update
  on public.announcements for update to authenticated
  using ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' );

drop policy if exists announcements_admin_delete on public.announcements;
create policy announcements_admin_delete
  on public.announcements for delete to authenticated
  using ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' );

grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;

-- Thông báo đầu tiên (chỉ thêm nếu bảng còn trống).
insert into public.announcements (title, body, tag, pinned, created_by)
select 'The city got a new look',
       'A new menu in city style, your streak and the number of explorers on the top bar, and this notice board for every Knoworld update.',
       'new', true, 'thinh.dhl3105@gmail.com'
where not exists (select 1 from public.announcements);
