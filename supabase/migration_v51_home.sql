-- ============================================================================
-- migration_v51_home.sql
-- MY HOME — nhà của Thịnh, thay cho Knoworld Museum.
--   • home_state   : 1 dòng — chế độ cửa chính + bố cục nhà (bản đầy đủ / bản chỉ có sân trước).
--   • home_guests  : khách mời, mỗi người một mã mời.
--   • home_knocks  : khách gõ cửa xin vào (RPC home_knock), chủ nhà duyệt.
--   • home_load    : RPC — được vào nhà mới trả bố cục đầy đủ (kèm đường dẫn ảnh).
--   • Storage bucket 'home' (đường dẫn công khai nhưng KHÔNG liệt kê được). Chỉ admin tải lên.
--   • XOÁ Museum: bảng museum_photos, museum_guestbook, museum_secrets, museum_pass_tries + RPC.
--     (Giữ get/set_visitor_museum + cột site_visitors.museum: dùng lưu trò Tìm 10 em vịt.
--      Giữ bucket 'museum' vì Metro Ad Wall đang dùng thư mục metro-ads/.
--      File ảnh cũ của Museum được tự xoá khi admin mở /home lần đầu.)
--
-- Chạy trong: Supabase Dashboard > SQL Editor > New query > dán toàn bộ > Run. Chạy lại nhiều lần vẫn an toàn.
-- ============================================================================

-- ---------------------------------------------------------------- trạng thái nhà
create table if not exists public.home_state (
  id            integer primary key default 1 check (id = 1),
  house_mode    text not null default 'invited' check (house_mode in ('public', 'members', 'invited', 'private')),
  layout_full   jsonb,
  layout_public jsonb,
  updated_at    timestamptz not null default now()
);
alter table public.home_state enable row level security;
revoke all on public.home_state from anon, authenticated;
grant select, insert, update on public.home_state to authenticated;
drop policy if exists home_state_admin on public.home_state;
create policy home_state_admin on public.home_state for all to authenticated
  using ((auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com');
insert into public.home_state (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------- khách mời
create table if not exists public.home_guests (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 40),
  code       text not null unique,
  anon_id    text,
  created_at timestamptz not null default now()
);
create index if not exists home_guests_anon_idx on public.home_guests (anon_id);
alter table public.home_guests enable row level security;
revoke all on public.home_guests from anon, authenticated;
grant select, insert, update, delete on public.home_guests to authenticated;
drop policy if exists home_guests_admin on public.home_guests;
create policy home_guests_admin on public.home_guests for all to authenticated
  using ((auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com');

-- ---------------------------------------------------------------- gõ cửa
create table if not exists public.home_knocks (
  id          uuid primary key default gen_random_uuid(),
  anon_id     text not null,
  name        text not null,
  status      text not null default 'pending' check (status in ('pending', 'ok', 'no')),
  created_at  timestamptz not null default now(),
  answered_at timestamptz
);
create index if not exists home_knocks_anon_idx on public.home_knocks (anon_id, created_at desc);
alter table public.home_knocks enable row level security;
revoke all on public.home_knocks from anon, authenticated;
grant select, update, delete on public.home_knocks to authenticated;
drop policy if exists home_knocks_admin on public.home_knocks;
create policy home_knocks_admin on public.home_knocks for all to authenticated
  using ((auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com');

-- ---------------------------------------------------------------- RPC: vào nhà
create or replace function public.home_load(p_anon_id text, p_code text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin  boolean := coalesce((auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com', false);
  v_mode   text;
  v_full   jsonb;
  v_pub    jsonb;
  v_gid    uuid;
  v_gname  text;
  v_ganon  text;
  v_bad    boolean := false;
  v_member boolean := false;
  v_ok     boolean;
  v_knock  text;
begin
  select house_mode, layout_full, layout_public into v_mode, v_full, v_pub from public.home_state where id = 1;
  v_mode := coalesce(v_mode, 'invited');

  if p_code is not null and length(trim(p_code)) between 4 and 12 then
    select id, name, anon_id into v_gid, v_gname, v_ganon from public.home_guests where code = upper(trim(p_code)) limit 1;
    if v_gid is null then v_bad := true; end if;
  end if;
  if v_gid is null and p_anon_id is not null and length(p_anon_id) > 0 then
    select id, name, anon_id into v_gid, v_gname, v_ganon from public.home_guests where anon_id = p_anon_id order by created_at limit 1;
  end if;
  if v_gid is not null and v_ganon is null and p_anon_id is not null and length(p_anon_id) > 0 then
    update public.home_guests set anon_id = left(p_anon_id, 64) where id = v_gid;
  end if;

  if p_anon_id is not null and length(p_anon_id) > 0 then
    select exists (select 1 from public.site_visitors sv where sv.anon_id = p_anon_id and coalesce(trim(sv.full_name), '') <> '') into v_member;
    select status into v_knock from public.home_knocks where anon_id = p_anon_id order by created_at desc limit 1;
  end if;

  v_ok := v_admin
       or v_mode = 'public'
       or (v_mode = 'members' and (v_member or v_gid is not null))
       or (v_mode = 'invited' and v_gid is not null);

  return jsonb_build_object(
    'ok', v_ok, 'owner', v_admin, 'mode', v_mode, 'member', v_member,
    'guest', v_gname, 'knock', v_knock, 'code_bad', v_bad,
    'layout', case when v_ok then v_full else v_pub end
  );
end;
$$;
grant execute on function public.home_load(text, text) to anon, authenticated;

-- ---------------------------------------------------------------- RPC: gõ cửa
create or replace function public.home_knock(p_anon_id text, p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := left(trim(coalesce(p_name, '')), 40);
  v_mode text;
begin
  if p_anon_id is null or length(trim(p_anon_id)) = 0 then return 'error'; end if;
  if length(v_name) = 0 then return 'noname'; end if;
  select house_mode into v_mode from public.home_state where id = 1;
  if coalesce(v_mode, 'invited') = 'private' then return 'closed'; end if;
  if exists (select 1 from public.home_knocks where anon_id = p_anon_id and status = 'pending') then return 'dup'; end if;
  if exists (select 1 from public.home_knocks where anon_id = p_anon_id and created_at > now() - interval '2 minutes') then return 'wait'; end if;
  if (select count(*) from public.home_knocks where status = 'pending') >= 200 then return 'wait'; end if;
  insert into public.home_knocks (anon_id, name) values (left(p_anon_id, 64), v_name);
  return 'ok';
end;
$$;
grant execute on function public.home_knock(text, text) to anon, authenticated;

-- ---------------------------------------------------------------- Storage 'home'
insert into storage.buckets (id, name, public)
values ('home', 'home', true)
on conflict (id) do update set public = true;

drop policy if exists "Home admin insert" on storage.objects;
drop policy if exists "Home admin update" on storage.objects;
drop policy if exists "Home admin delete" on storage.objects;
drop policy if exists "Home admin read"   on storage.objects;
create policy "Home admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'home' and (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com');
create policy "Home admin update" on storage.objects for update to authenticated
  using (bucket_id = 'home' and (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com');
create policy "Home admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'home' and (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com');
create policy "Home admin read" on storage.objects for select to authenticated
  using (bucket_id = 'home' and (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com');

-- ---------------------------------------------------------------- bỏ Museum
drop function if exists public.museum_love_photos(text, text);
drop function if exists public.museum_set_love_pass(text);
drop function if exists public.museum_sign_guestbook(text, text, text);
drop function if exists public.museum_leaderboard(integer);
drop table if exists public.museum_photos;
drop table if exists public.museum_guestbook;
drop table if exists public.museum_pass_tries;
drop table if exists public.museum_secrets;
