-- ============================================================================
-- migration_v48_holidays.sql
-- NGÀY LỄ VIỆT NAM — giao diện chúc mừng riêng cho từng ngày lễ.
--   • Bảng holiday_wishes: tường "Gửi lời chúc" của mỗi ngày lễ (mỗi năm một khoá,
--     vd 'teachers-2026'). Ai cũng đọc & gửi được (kể cả khách), chỉ admin xoá.
--   • site_content key 'holidays': lời chúc / bật-tắt từng ngày lễ (admin sửa trên web).
--   • (Tầng hầm Metro B1/B2 không cần bảng mới — cấu hình ga ở lib/metroStations.js.)
--
-- Chạy trong: Supabase Dashboard > SQL Editor > New query. An toàn khi chạy lại.
-- ============================================================================

create table if not exists public.holiday_wishes (
  id          uuid primary key default gen_random_uuid(),
  holiday_key text not null,                -- '<id>-<năm>', vd 'tet-2027'
  name        text not null default 'Cư dân Knoworld',
  message     text not null,
  anon_id     text,                         -- trình duyệt gửi (để giới hạn spam)
  created_at  timestamptz not null default now(),
  constraint holiday_wishes_key_len  check (char_length(holiday_key) between 3 and 40),
  constraint holiday_wishes_name_len check (char_length(name) between 1 and 40),
  constraint holiday_wishes_msg_len  check (char_length(message) between 2 and 220)
);
create index if not exists holiday_wishes_key_idx on public.holiday_wishes (holiday_key, created_at desc);

alter table public.holiday_wishes enable row level security;

drop policy if exists holiday_wishes_read on public.holiday_wishes;
create policy holiday_wishes_read on public.holiday_wishes
  for select using (true);

drop policy if exists holiday_wishes_insert on public.holiday_wishes;
create policy holiday_wishes_insert on public.holiday_wishes
  for insert to anon, authenticated
  with check (
    char_length(message) between 2 and 220
    and char_length(name) between 1 and 40
    -- tối đa 5 lời chúc / trình duyệt / ngày lễ
    and (anon_id is null or (select count(*) from public.holiday_wishes w
         where w.anon_id = holiday_wishes.anon_id and w.holiday_key = holiday_wishes.holiday_key) < 5)
  );

drop policy if exists holiday_wishes_admin_delete on public.holiday_wishes;
create policy holiday_wishes_admin_delete on public.holiday_wishes
  for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com');

grant select, insert on public.holiday_wishes to anon, authenticated;
grant delete on public.holiday_wishes to authenticated;

-- Lời chúc tuỳ chỉnh (để trống = dùng lời chúc mặc định trong code).
insert into public.site_content (key, data) values ('holidays', '{}'::jsonb)
on conflict (key) do nothing;

-- Realtime: lời chúc mới hiện ngay cho mọi người đang mở thiệp.
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'holiday_wishes') then
    alter publication supabase_realtime add table public.holiday_wishes;
  end if;
end $$;
