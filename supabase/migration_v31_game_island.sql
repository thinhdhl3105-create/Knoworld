-- ============================================================================
-- migration_v31_game_island.sql
-- GAME ISLAND — kết quả trò chơi giảng viên công bố (thứ tự thuyết trình, thương hiệu).
-- Ai cũng ĐỌC được; chỉ ADMIN được công bố / xoá.
-- Danh sách nhóm & thương hiệu mặc định lưu ở bảng site_content (key = 'games'), có sẵn từ v12.
--
-- Chạy trong: Supabase Dashboard > SQL Editor > New query. An toàn khi chạy lại.
-- ============================================================================

create table if not exists public.game_rounds (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('race', 'brands')),  -- Harbour Cup / Billboard Draw
  title       text,
  data        jsonb not null default '{}'::jsonb,
  created_by  text,
  created_at  timestamptz not null default now()
);

create index if not exists game_rounds_created_idx on public.game_rounds (kind, created_at desc);

alter table public.game_rounds enable row level security;

drop policy if exists game_rounds_read_all on public.game_rounds;
create policy game_rounds_read_all
  on public.game_rounds for select
  using (true);

-- Đổi email bên dưới nếu tài khoản admin thay đổi.
drop policy if exists game_rounds_admin_write on public.game_rounds;
create policy game_rounds_admin_write
  on public.game_rounds for all to authenticated
  using ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' );

grant select on public.game_rounds to anon, authenticated;
grant insert, update, delete on public.game_rounds to authenticated;
