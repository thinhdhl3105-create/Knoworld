-- ============================================================================
-- migration_v40_museum.sql
-- KNOWORLD MUSEUM — đảo bảo tàng nối Main City và Temple Isle bằng cầu.
--   • museum_photos      : ảnh treo trong 5 phòng (class, event, award, lens, love).
--                          Khách đọc được mọi phòng TRỪ 'love'. Chỉ admin thêm/sửa/xoá.
--   • museum_secrets     : mật khẩu Phòng Riêng (chỉ lưu bản băm bcrypt, không ai đọc được).
--   • museum_love_photos : RPC — nhập đúng mật khẩu mới trả về ảnh Phòng Riêng.
--   • museum_guestbook   : Sổ lưu bút (ai cũng ký được, 1 lời nhắn / phút / trình duyệt).
--   • site_visitors.museum : điểm khám phá + tiến trình (giống temple v36) + bảng xếp hạng.
--   • Storage bucket 'museum' (public URL, nhưng KHÔNG cho liệt kê file). Chỉ admin tải lên.
--
-- Chạy trong: Supabase Dashboard > SQL Editor > New query > dán toàn bộ > Run.
-- An toàn khi chạy lại nhiều lần.
-- Mật khẩu Phòng Riêng mặc định: 1402  -> đổi ngay ở trang /museum/admin.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- ảnh
create table if not exists public.museum_photos (
  id          uuid primary key default gen_random_uuid(),
  room        text not null check (room in ('class', 'event', 'award', 'lens', 'love')),
  url         text not null,
  path        text,
  title       text not null default '',
  caption     text not null default '',
  taken       text not null default '',
  place       text not null default '',
  tag         text not null default '',
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists museum_photos_room_idx on public.museum_photos (room, sort, created_at);

alter table public.museum_photos enable row level security;

drop policy if exists museum_photos_public_read on public.museum_photos;
create policy museum_photos_public_read
  on public.museum_photos for select to anon, authenticated
  using (room <> 'love');

drop policy if exists museum_photos_admin_all on public.museum_photos;
create policy museum_photos_admin_all
  on public.museum_photos for all to authenticated
  using ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' );

grant select on public.museum_photos to anon, authenticated;
grant insert, update, delete on public.museum_photos to authenticated;

-- ---------------------------------------------------------------- mật khẩu Phòng Riêng
create table if not exists public.museum_secrets (
  id          integer primary key default 1 check (id = 1),
  love_hash   text not null,
  updated_at  timestamptz not null default now()
);
alter table public.museum_secrets enable row level security;
revoke all on public.museum_secrets from anon, authenticated;
insert into public.museum_secrets (id, love_hash)
values (1, extensions.crypt('1402', extensions.gen_salt('bf')))
on conflict (id) do nothing;

-- nhật ký nhập sai (chống dò mật khẩu)
create table if not exists public.museum_pass_tries (
  id      bigserial primary key,
  anon_id text,
  at      timestamptz not null default now()
);
alter table public.museum_pass_tries enable row level security;
revoke all on public.museum_pass_tries from anon, authenticated;

-- Nhập đúng mật khẩu -> { ok: true, photos: [...] }. Sai -> { ok: false }.
-- Quá 8 lần sai / 10 phút (mỗi trình duyệt) hoặc 60 lần sai / 10 phút (toàn hệ thống) -> { ok:false, locked:true }.
create or replace function public.museum_love_photos(p_pass text, p_anon_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_mine int;
  v_all int;
begin
  delete from public.museum_pass_tries where at < now() - interval '1 day';
  select count(*) into v_mine from public.museum_pass_tries
    where at > now() - interval '10 minutes' and anon_id is not distinct from p_anon_id;
  select count(*) into v_all from public.museum_pass_tries where at > now() - interval '10 minutes';
  if v_mine >= 8 or v_all >= 60 then
    return jsonb_build_object('ok', false, 'locked', true);
  end if;

  select love_hash into v_hash from public.museum_secrets where id = 1;
  if v_hash is null or p_pass is null or length(p_pass) = 0 or length(p_pass) > 64
     or extensions.crypt(p_pass, v_hash) <> v_hash then
    insert into public.museum_pass_tries (anon_id) values (left(p_anon_id, 64));
    return jsonb_build_object('ok', false);
  end if;

  return jsonb_build_object('ok', true, 'photos', coalesce((
    select jsonb_agg(to_jsonb(p) order by p.sort, p.created_at)
    from public.museum_photos p where p.room = 'love'
  ), '[]'::jsonb));
end;
$$;
grant execute on function public.museum_love_photos(text, text) to anon, authenticated;

-- Admin đổi mật khẩu Phòng Riêng.
create or replace function public.museum_set_love_pass(p_pass text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if (auth.jwt() ->> 'email') is distinct from 'thinh.dhl3105@gmail.com' then
    return false;
  end if;
  if p_pass is null or length(p_pass) < 4 or length(p_pass) > 64 then
    return false;
  end if;
  update public.museum_secrets
     set love_hash = extensions.crypt(p_pass, extensions.gen_salt('bf')), updated_at = now()
   where id = 1;
  delete from public.museum_pass_tries;
  return true;
end;
$$;
grant execute on function public.museum_set_love_pass(text) to authenticated;

-- ---------------------------------------------------------------- sổ lưu bút
create table if not exists public.museum_guestbook (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 24),
  message     text not null check (char_length(message) between 1 and 140),
  anon_id     text,
  created_at  timestamptz not null default now()
);
create index if not exists museum_guestbook_created_idx on public.museum_guestbook (created_at desc);
alter table public.museum_guestbook enable row level security;

drop policy if exists museum_guestbook_read on public.museum_guestbook;
create policy museum_guestbook_read on public.museum_guestbook for select to anon, authenticated using (true);
drop policy if exists museum_guestbook_admin_delete on public.museum_guestbook;
create policy museum_guestbook_admin_delete on public.museum_guestbook for delete to authenticated
  using ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' );
grant select on public.museum_guestbook to anon, authenticated;
grant delete on public.museum_guestbook to authenticated;
revoke insert, update on public.museum_guestbook from anon, authenticated;

create or replace function public.museum_sign_guestbook(p_anon_id text, p_name text, p_message text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := left(trim(coalesce(p_name, '')), 24);
  v_msg  text := left(trim(coalesce(p_message, '')), 140);
begin
  if length(v_name) = 0 or length(v_msg) = 0 then return false; end if;
  if exists (select 1 from public.museum_guestbook
             where anon_id = p_anon_id and created_at > now() - interval '60 seconds') then
    return false;
  end if;
  insert into public.museum_guestbook (name, message, anon_id) values (v_name, v_msg, left(p_anon_id, 64));
  return true;
end;
$$;
grant execute on function public.museum_sign_guestbook(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------- điểm khám phá
alter table public.site_visitors
  add column if not exists museum            jsonb,
  add column if not exists museum_updated_at timestamptz;

create or replace function public.set_visitor_museum(p_anon_id text, p_state jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_anon_id is null or length(trim(p_anon_id)) = 0 or p_state is null then return false; end if;
  if jsonb_typeof(p_state) <> 'object' or length(p_state::text) > 20000 then return false; end if;
  select sv.id into v_id from public.site_visitors sv
   where sv.anon_id = p_anon_id order by sv.created_at desc limit 1;
  if v_id is null then return false; end if;
  update public.site_visitors set museum = p_state, museum_updated_at = now() where id = v_id;
  return true;
end;
$$;

create or replace function public.get_visitor_museum(p_anon_id text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select sv.museum from public.site_visitors sv
   where sv.anon_id = p_anon_id order by sv.created_at desc limit 1;
$$;

-- Bảng xếp hạng: chỉ trả TÊN GỌI (chữ cuối của họ tên) + điểm, không lộ gì khác.
create or replace function public.museum_leaderboard(p_limit integer default 10)
returns table (name text, pts integer)
language sql
stable
security definer
set search_path = public
as $$
  select regexp_replace(trim(sv.full_name), '^.*\s', '') as name,
         least(coalesce((sv.museum ->> 'pts')::int, 0), 99999) as pts
  from public.site_visitors sv
  where sv.museum ? 'pts' and (sv.museum ->> 'pts') ~ '^[0-9]+$' and (sv.museum ->> 'pts')::int > 0
  order by 2 desc, sv.museum_updated_at asc
  limit greatest(1, least(coalesce(p_limit, 10), 20));
$$;

grant execute on function public.set_visitor_museum(text, jsonb) to anon, authenticated;
grant execute on function public.get_visitor_museum(text) to anon, authenticated;
grant execute on function public.museum_leaderboard(integer) to anon, authenticated;

-- ---------------------------------------------------------------- Storage
insert into storage.buckets (id, name, public)
values ('museum', 'museum', true)
on conflict (id) do update set public = true;

drop policy if exists "Museum admin insert" on storage.objects;
drop policy if exists "Museum admin update" on storage.objects;
drop policy if exists "Museum admin delete" on storage.objects;
drop policy if exists "Museum admin read"   on storage.objects;

create policy "Museum admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'museum' and (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com');
create policy "Museum admin update" on storage.objects for update to authenticated
  using (bucket_id = 'museum' and (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com');
create policy "Museum admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'museum' and (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com');
create policy "Museum admin read" on storage.objects for select to authenticated
  using (bucket_id = 'museum' and (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com');
-- Không có policy đọc cho khách: ảnh xem được qua đường dẫn công khai (tên file ngẫu nhiên),
-- nhưng không ai liệt kê được danh sách file. Đường dẫn ảnh Phòng Riêng chỉ trả về khi nhập đúng mật khẩu.
