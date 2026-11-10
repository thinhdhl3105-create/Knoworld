-- ============================================================================
-- migration_v30_island.sql
-- THINH'S ISLAND — lịch riêng của admin: lịch dạy, lịch họp, ngày quan trọng.
-- RIÊNG TƯ: chỉ tài khoản admin đọc / ghi được. Khách và sinh viên không thấy gì.
--
-- Chạy trong: Supabase Dashboard > SQL Editor > New query.
-- An toàn khi chạy lại nhiều lần (idempotent).
-- ============================================================================

create table if not exists public.private_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  kind        text not null default 'teach'
              check (kind in ('teach', 'meet', 'key')),   -- Lecture Hall / City Hall / Lighthouse
  event_date  date not null,
  start_time  time,
  end_time    time,
  place       text,
  note        text,
  series_id   uuid,                                       -- các buổi lặp hằng tuần dùng chung series_id
  created_at  timestamptz not null default now()
);

create index if not exists private_events_date_idx on public.private_events (event_date, start_time);
create index if not exists private_events_series_idx on public.private_events (series_id);

alter table public.private_events enable row level security;

-- Đổi email bên dưới nếu tài khoản admin thay đổi.
drop policy if exists private_events_admin_all on public.private_events;
create policy private_events_admin_all
  on public.private_events for all to authenticated
  using ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' );

-- Khách (anon) không có quyền gì trên bảng này.
revoke all on public.private_events from anon;
grant select, insert, update, delete on public.private_events to authenticated;
