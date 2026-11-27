-- ============================================================================
-- migration_v64_creative_city.sql
-- CREATIVE CITY — thành phố riêng cho buổi dạy thử / workshop với học sinh cấp 3.
--   • Học sinh KHÔNG cần tài khoản: vào /creative bằng mã phòng + biệt danh.
--     Mỗi máy nhận một "vé" bí mật (token) lưu trên máy, mọi thao tác đi qua RPC.
--   • cc_rooms     : phòng theo buổi học (trạm hiện tại, trạng thái câu đố, mã Mentimeter…).
--   • cc_players   : người chơi khách trong phòng (tên, màu, điểm, sản phẩm được bốc).
--   • cc_questions : bộ câu hỏi Ảnh Lạ (ảnh, câu hỏi, 4 đáp án, đáp án đúng) — dùng chung mọi phòng.
--   • cc_answers   : câu trả lời; điểm do MÁY CHỦ tính theo thời gian (đúng + nhanh = nhiều điểm).
--   • cc_brands    : danh sách sản phẩm thương hiệu Việt cho Xưởng Vẽ.
--   • cc_art       : tranh học sinh tải lên Phòng Tranh (chờ duyệt → hiện / ẩn).
--   • cc_hearts    : thả tim tranh.   • cc_words : word cloud Quảng trường.
--   • Storage bucket 'creative' (công khai): học sinh chỉ tải được vào thư mục art/,
--     tối đa 5MB, chỉ ảnh. Ảnh câu hỏi (quiz/) chỉ admin tải.
--   • Chỉ tài khoản admin (thinh.dhl3105@gmail.com) đọc/sửa trực tiếp các bảng.
--
-- Chạy trong: Supabase Dashboard > SQL Editor > New query > dán toàn bộ > Run.
-- An toàn khi chạy lại nhiều lần.
-- ============================================================================

create table if not exists public.cc_rooms (
  code             text primary key check (code ~ '^[A-Z0-9-]{3,16}$'),
  title            text not null default 'Creative City',
  station          text not null default 'gate' check (station in ('gate', 'guess', 'draw', 'wall', 'plaza')),
  quiz_index       integer not null default 0 check (quiz_index >= 0),
  quiz_phase       text not null default 'idle' check (quiz_phase in ('idle', 'run', 'reveal', 'board')),
  quiz_started_at  timestamptz,
  quiz_seconds     integer not null default 20 check (quiz_seconds between 5 and 120),
  draw_started_at  timestamptz,
  draw_minutes     integer not null default 4 check (draw_minutes between 1 and 60),
  menti_code       text not null default '',
  menti_embed      text not null default '',
  is_open          boolean not null default true,
  created_at       timestamptz not null default now()
);

create table if not exists public.cc_players (
  id          uuid primary key default gen_random_uuid(),
  room        text not null references public.cc_rooms(code) on delete cascade on update cascade,
  token       uuid not null unique default gen_random_uuid(),
  name        text not null,
  color       text not null default '#c6bfff',
  score       integer not null default 0,
  brand       text,
  words_sent  integer not null default 0,
  arts_sent   integer not null default 0,
  joined_at   timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);
create index if not exists cc_players_room_idx on public.cc_players (room, score desc);

create table if not exists public.cc_questions (
  id          uuid primary key default gen_random_uuid(),
  sort        integer not null default 0,
  question    text not null default 'Đây là gì?',
  opts        text[] not null check (array_length(opts, 1) = 4),
  ok          integer not null check (ok between 0 and 3),
  image_path  text,
  builtin     text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.cc_answers (
  room       text not null references public.cc_rooms(code) on delete cascade on update cascade,
  q_index    integer not null,
  q_id       uuid references public.cc_questions(id) on delete set null,
  player_id  uuid not null references public.cc_players(id) on delete cascade,
  choice     integer not null check (choice between 0 and 3),
  correct    boolean not null,
  points     integer not null default 0,
  at         timestamptz not null default now(),
  primary key (room, q_index, player_id)
);

create table if not exists public.cc_brands (
  name    text primary key,
  item    text not null,
  sort    integer not null default 0,
  active  boolean not null default true
);

create table if not exists public.cc_art (
  id          uuid primary key default gen_random_uuid(),
  room        text not null references public.cc_rooms(code) on delete cascade on update cascade,
  player_id   uuid references public.cc_players(id) on delete set null,
  author      text not null default '',
  image_path  text not null,
  title       text not null default '',
  caption     text not null default '',
  brand       text not null default '',
  status      text not null default 'pending' check (status in ('pending', 'ok', 'hidden')),
  hearts      integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists cc_art_room_idx on public.cc_art (room, status, created_at desc);

create table if not exists public.cc_hearts (
  art_id     uuid not null references public.cc_art(id) on delete cascade,
  player_id  uuid not null references public.cc_players(id) on delete cascade,
  primary key (art_id, player_id)
);

create table if not exists public.cc_words (
  room  text not null references public.cc_rooms(code) on delete cascade on update cascade,
  word  text not null,
  n     integer not null default 1,
  primary key (room, word)
);

-- ---------------------------------------------------------------- quyền: chỉ admin đụng trực tiếp bảng
create or replace function public.cc_is_admin() returns boolean
language sql stable as $$ select coalesce(auth.jwt() ->> 'email', '') = 'thinh.dhl3105@gmail.com' $$;

do $$
declare t text;
begin
  foreach t in array array['cc_rooms','cc_players','cc_questions','cc_answers','cc_brands','cc_art','cc_hearts','cc_words'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.cc_is_admin()) with check (public.cc_is_admin())', t || '_admin', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- tiện ích
create or replace function public.cc_room_row(p_room text) returns public.cc_rooms
language plpgsql stable security definer set search_path = public as $$
declare r public.cc_rooms;
begin
  select * into r from public.cc_rooms where code = upper(btrim(coalesce(p_room, '')));
  if r.code is null or not r.is_open then raise exception 'room_not_found'; end if;
  return r;
end $$;

create or replace function public.cc_player_row(p_room text, p_token uuid) returns public.cc_players
language plpgsql stable security definer set search_path = public as $$
declare p public.cc_players;
begin
  select * into p from public.cc_players where token = p_token and room = upper(btrim(coalesce(p_room, '')));
  if p.id is null then raise exception 'not_joined'; end if;
  return p;
end $$;

create or replace function public.cc_question_at(p_index integer) returns public.cc_questions
language sql stable security definer set search_path = public as $$
  select * from public.cc_questions where active order by sort, created_at offset greatest(p_index, 0) limit 1
$$;

revoke all on function public.cc_room_row(text) from public, anon, authenticated;
revoke all on function public.cc_player_row(text, uuid) from public, anon, authenticated;
revoke all on function public.cc_question_at(integer) from public, anon, authenticated;

-- ---------------------------------------------------------------- vào phòng
create or replace function public.cc_join(p_room text, p_name text, p_color text, p_token uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r public.cc_rooms := public.cc_room_row(p_room);
  p public.cc_players;
  v_name  text := left(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 24);
  v_color text := case when coalesce(p_color, '') ~ '^#[0-9a-fA-F]{6}$' then p_color else null end;
begin
  if p_token is not null then
    select * into p from public.cc_players where token = p_token and room = r.code;
  end if;
  if p.id is null then
    if v_name = '' then raise exception 'name_required'; end if;
    if (select count(*) from public.cc_players where room = r.code) >= 300 then raise exception 'room_full'; end if;
    insert into public.cc_players (room, name, color) values (r.code, v_name, coalesce(v_color, '#c6bfff')) returning * into p;
  else
    update public.cc_players
       set name = coalesce(nullif(v_name, ''), name), color = coalesce(v_color, color), last_seen = now()
     where id = p.id returning * into p;
  end if;
  return jsonb_build_object('token', p.token, 'name', p.name, 'color', p.color, 'room', r.code, 'title', r.title);
end $$;

-- ---------------------------------------------------------------- trạng thái phòng (điện thoại hỏi mỗi ~2 giây)
create or replace function public.cc_state(p_room text, p_token uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r public.cc_rooms := public.cc_room_row(p_room);
  p public.cc_players;
  q public.cc_questions;
  v_total integer; v_quiz jsonb; v_reveal boolean; v_me jsonb := null;
begin
  if p_token is not null then
    select * into p from public.cc_players where token = p_token and room = r.code;
    if p.id is not null and p.last_seen < now() - interval '15 seconds' then
      update public.cc_players set last_seen = now() where id = p.id;
    end if;
  end if;

  select count(*) into v_total from public.cc_questions where active;
  q := public.cc_question_at(r.quiz_index);
  v_reveal := r.quiz_phase in ('reveal', 'board');
  if q.id is not null then
    v_quiz := jsonb_build_object(
      'index', r.quiz_index, 'total', v_total, 'phase', r.quiz_phase,
      'started_at', r.quiz_started_at, 'seconds', r.quiz_seconds,
      'answered', (select count(*) from public.cc_answers a where a.room = r.code and a.q_index = r.quiz_index),
      'question', case when r.quiz_phase <> 'idle' then q.question end,
      'opts',     case when r.quiz_phase <> 'idle' then to_jsonb(q.opts) end,
      'image_path', case when r.quiz_phase <> 'idle' then q.image_path end,
      'builtin',  case when r.quiz_phase <> 'idle' then q.builtin end,
      'ok',       case when v_reveal then q.ok end,
      'dist',     case when v_reveal then (
                     select jsonb_agg((select count(*) from public.cc_answers a
                                        where a.room = r.code and a.q_index = r.quiz_index and a.choice = g.i) order by g.i)
                       from generate_series(0, 3) as g(i)) end,
      'mine',     case when p.id is not null then (
                     select jsonb_build_object('choice', a.choice,
                                               'correct', case when v_reveal then a.correct end,
                                               'points',  case when v_reveal then a.points end)
                       from public.cc_answers a where a.room = r.code and a.q_index = r.quiz_index and a.player_id = p.id) end
    );
  end if;

  if p.id is not null then
    v_me := jsonb_build_object('name', p.name, 'color', p.color, 'score', p.score, 'brand', p.brand,
      'brand_item', (select b.item from public.cc_brands b where b.name = p.brand),
      'rank', 1 + (select count(*) from public.cc_players x where x.room = r.code and x.score > p.score),
      'words_left', greatest(0, 3 - p.words_sent), 'arts_left', greatest(0, 3 - p.arts_sent));
  end if;

  return jsonb_build_object(
    'now', now(), 'room', r.code, 'title', r.title, 'station', r.station,
    'menti_code', r.menti_code,
    'players', (select count(*) from public.cc_players x where x.room = r.code),
    'quiz', v_quiz, 'me', v_me,
    'draw', jsonb_build_object('started_at', r.draw_started_at, 'minutes', r.draw_minutes),
    'top', (select coalesce(jsonb_agg(jsonb_build_object('name', t.name, 'color', t.color, 'score', t.score) order by t.score desc, t.joined_at), '[]'::jsonb)
              from (select * from public.cc_players x where x.room = r.code order by x.score desc, x.joined_at limit 5) t),
    'words', (select coalesce(jsonb_agg(jsonb_build_object('w', w.word, 'n', w.n) order by w.n desc, w.word), '[]'::jsonb)
                from (select * from public.cc_words x where x.room = r.code order by x.n desc limit 40) w)
  );
end $$;

-- ---------------------------------------------------------------- trả lời câu đố (điểm do máy chủ tính)
create or replace function public.cc_answer(p_room text, p_token uuid, p_choice integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r public.cc_rooms := public.cc_room_row(p_room);
  p public.cc_players := public.cc_player_row(p_room, p_token);
  q public.cc_questions;
  v_elapsed float8; v_left float8; v_ok boolean; v_pts integer; v_n integer;
begin
  if r.quiz_phase <> 'run' or r.quiz_started_at is null then raise exception 'not_running'; end if;
  if p_choice is null or p_choice not between 0 and 3 then raise exception 'bad_choice'; end if;
  v_elapsed := extract(epoch from (now() - r.quiz_started_at));
  if v_elapsed > r.quiz_seconds + 2 then raise exception 'time_up'; end if;
  q := public.cc_question_at(r.quiz_index);
  if q.id is null then raise exception 'no_question'; end if;
  v_left := greatest(0, least(1, 1 - v_elapsed / r.quiz_seconds));
  v_ok := (p_choice = q.ok);
  v_pts := case when v_ok then round(500 + 500 * v_left)::integer else 0 end;
  insert into public.cc_answers (room, q_index, q_id, player_id, choice, correct, points)
  values (r.code, r.quiz_index, q.id, p.id, p_choice, v_ok, v_pts)
  on conflict do nothing;
  get diagnostics v_n = row_count;
  if v_n = 0 then return jsonb_build_object('ok', false, 'reason', 'already'); end if;
  if v_pts > 0 then update public.cc_players set score = score + v_pts where id = p.id; end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- bốc sản phẩm để vẽ (chia đều trong phòng)
create or replace function public.cc_draw_brand(p_room text, p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r public.cc_rooms := public.cc_room_row(p_room);
  p public.cc_players := public.cc_player_row(p_room, p_token);
  v_brand text;
begin
  if p.brand is null then
    select b.name into v_brand
      from public.cc_brands b
     where b.active
     order by (select count(*) from public.cc_players x where x.room = r.code and x.brand = b.name), random()
     limit 1;
    if v_brand is null then raise exception 'no_brands'; end if;
    update public.cc_players set brand = v_brand where id = p.id;
  else
    v_brand := p.brand;
  end if;
  return jsonb_build_object('brand', v_brand, 'item', (select item from public.cc_brands where name = v_brand));
end $$;

-- ---------------------------------------------------------------- đăng tranh (ảnh đã tải vào creative/art/<mã phòng>/…)
create or replace function public.cc_submit_art(p_room text, p_token uuid, p_path text, p_title text, p_caption text, p_brand text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r public.cc_rooms := public.cc_room_row(p_room);
  p public.cc_players := public.cc_player_row(p_room, p_token);
  v_id uuid;
begin
  if coalesce(p_path, '') !~ ('^art/' || r.code || '/[A-Za-z0-9._-]+$') then raise exception 'bad_path'; end if;
  if p.arts_sent >= 3 then raise exception 'too_many'; end if;
  insert into public.cc_art (room, player_id, author, image_path, title, caption, brand)
  values (r.code, p.id, p.name, p_path,
          left(btrim(coalesce(p_title, '')), 60), left(btrim(coalesce(p_caption, '')), 140), left(btrim(coalesce(p_brand, '')), 60))
  returning id into v_id;
  update public.cc_players set arts_sent = arts_sent + 1 where id = p.id;
  return jsonb_build_object('id', v_id);
end $$;

-- ---------------------------------------------------------------- tường tranh
create or replace function public.cc_wall(p_room text, p_token uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r public.cc_rooms := public.cc_room_row(p_room);
  v_pid uuid;
begin
  if p_token is not null then select id into v_pid from public.cc_players where token = p_token and room = r.code; end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', a.id, 'title', a.title, 'caption', a.caption, 'brand', a.brand, 'author', a.author,
             'image_path', a.image_path, 'hearts', a.hearts, 'pending', a.status = 'pending',
             'mine', v_pid is not null and a.player_id = v_pid,
             'liked', v_pid is not null and exists (select 1 from public.cc_hearts h where h.art_id = a.id and h.player_id = v_pid))
           order by a.created_at desc), '[]'::jsonb)
      from (select * from public.cc_art x
             where x.room = r.code and (x.status = 'ok' or (x.status = 'pending' and v_pid is not null and x.player_id = v_pid))
             order by x.created_at desc limit 300) a
  );
end $$;

create or replace function public.cc_heart(p_room text, p_token uuid, p_art uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p public.cc_players := public.cc_player_row(p_room, p_token);
  v_n integer; v_liked boolean;
begin
  if not exists (select 1 from public.cc_art where id = p_art and room = p.room and status = 'ok') then raise exception 'not_found'; end if;
  delete from public.cc_hearts where art_id = p_art and player_id = p.id;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    insert into public.cc_hearts (art_id, player_id) values (p_art, p.id);
    v_liked := true;
  else
    v_liked := false;
  end if;
  update public.cc_art set hearts = (select count(*) from public.cc_hearts where art_id = p_art) where id = p_art returning hearts into v_n;
  return jsonb_build_object('liked', v_liked, 'hearts', v_n);
end $$;

-- ---------------------------------------------------------------- word cloud (tối đa 3 từ / người)
create or replace function public.cc_word(p_room text, p_token uuid, p_word text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p public.cc_players := public.cc_player_row(p_room, p_token);
  v_w text := lower(left(btrim(regexp_replace(coalesce(p_word, ''), '\s+', ' ', 'g')), 24));
begin
  if v_w = '' then raise exception 'empty'; end if;
  if p.words_sent >= 3 then raise exception 'too_many'; end if;
  insert into public.cc_words (room, word) values (p.room, v_w)
  on conflict (room, word) do update set n = public.cc_words.n + 1;
  update public.cc_players set words_sent = words_sent + 1 where id = p.id;
  return jsonb_build_object('ok', true, 'left', 2 - p.words_sent);
end $$;

-- ---------------------------------------------------------------- admin: làm mới phòng
create or replace function public.cc_admin_reset(p_room text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.cc_is_admin() then raise exception 'not admin'; end if;
  delete from public.cc_answers where room = p_room;
  delete from public.cc_words   where room = p_room;
  delete from public.cc_art     where room = p_room;
  delete from public.cc_players where room = p_room;
  update public.cc_rooms set station = 'gate', quiz_index = 0, quiz_phase = 'idle', quiz_started_at = null, draw_started_at = null
   where code = p_room;
end $$;


-- ---------------------------------------------------------------- admin: điều khiển câu đố & giờ vẽ (theo giờ MÁY CHỦ)
create or replace function public.cc_admin_quiz(p_room text, p_phase text, p_index integer default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.cc_is_admin() then raise exception 'not admin'; end if;
  if p_phase not in ('idle', 'run', 'reveal', 'board') then raise exception 'bad phase'; end if;
  update public.cc_rooms
     set quiz_phase = p_phase,
         quiz_index = coalesce(greatest(p_index, 0), quiz_index),
         quiz_started_at = case when p_phase = 'run' then now() else quiz_started_at end,
         station = 'guess'
   where code = p_room;
end $$;

create or replace function public.cc_admin_draw(p_room text, p_minutes integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.cc_is_admin() then raise exception 'not admin'; end if;
  update public.cc_rooms
     set draw_started_at = case when p_minutes is null then null else now() end,
         draw_minutes = coalesce(least(greatest(p_minutes, 1), 60), draw_minutes),
         station = 'draw'
   where code = p_room;
end $$;

grant execute on function public.cc_join(text, text, text, uuid) to anon, authenticated;
grant execute on function public.cc_state(text, uuid) to anon, authenticated;
grant execute on function public.cc_answer(text, uuid, integer) to anon, authenticated;
grant execute on function public.cc_draw_brand(text, uuid) to anon, authenticated;
grant execute on function public.cc_submit_art(text, uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.cc_wall(text, uuid) to anon, authenticated;
grant execute on function public.cc_heart(text, uuid, uuid) to anon, authenticated;
grant execute on function public.cc_word(text, uuid, text) to anon, authenticated;
grant execute on function public.cc_admin_reset(text) to authenticated;
grant execute on function public.cc_admin_quiz(text, text, integer) to authenticated;
grant execute on function public.cc_admin_draw(text, integer) to authenticated;

-- ---------------------------------------------------------------- Storage 'creative'
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('creative', 'creative', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Creative guest upload" on storage.objects;
drop policy if exists "Creative admin insert" on storage.objects;
drop policy if exists "Creative admin update" on storage.objects;
drop policy if exists "Creative admin delete" on storage.objects;
drop policy if exists "Creative admin read"   on storage.objects;
create policy "Creative guest upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'creative' and (storage.foldername(name))[1] = 'art');
create policy "Creative admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'creative' and (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com');
create policy "Creative admin update" on storage.objects for update to authenticated
  using (bucket_id = 'creative' and (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com');
create policy "Creative admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'creative' and (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com');
create policy "Creative admin read" on storage.objects for select to authenticated
  using (bucket_id = 'creative' and (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com');

-- ---------------------------------------------------------------- dữ liệu ban đầu
insert into public.cc_rooms (code, title) values ('CC-DEMO', 'Buổi dạy thử Creative City')
on conflict (code) do nothing;

insert into public.cc_brands (name, item, sort) values
  ('Tương ớt Chin-su',   'Chai tương ớt Chin-su',       1),
  ('Vinamilk',           'Hộp sữa tươi Vinamilk',       2),
  ('Trà Xanh Không Độ',  'Chai Trà Xanh Không Độ',      3),
  ('Nước mắm Nam Ngư',   'Chai nước mắm Nam Ngư',       4),
  ('Cà phê G7',          'Gói cà phê G7',               5),
  ('Biti''s Hunter',     'Đôi giày Biti''s Hunter',     6),
  ('Number 1',           'Chai nước tăng lực Number 1', 7)
on conflict (name) do nothing;

-- Bộ câu hỏi mẫu (ảnh minh hoạ có sẵn trong web, cắt sát). Admin thay bằng ảnh chụp thật ở /creative/host.
insert into public.cc_questions (sort, question, opts, ok, builtin)
select * from (values
  (1, 'Cận cảnh của loại quả nào?',          array['Trái lê', 'Trái táo', 'Quả mận', 'Quả đào'], 1, 'apple'),
  (2, 'Đầu nhọn này là của vật gì?',          array['Bút kẻ mắt', 'Bút sáp màu', 'Que xiên tre', 'Bút chì gỗ'], 3, 'pencil'),
  (3, 'Những hạt tròn này là gì?',            array['Thạch cà phê', 'Trân châu trà sữa', 'Hạt é', 'Đậu đen'], 1, 'pearl'),
  (4, 'Đây là một góc của…',                  array['Máy tính bỏ túi', 'Điều khiển TV', 'Bàn phím laptop', 'Điện thoại bàn'], 2, 'keyboard'),
  (5, 'Lát cắt của loại quả nào?',            array['Lát chanh', 'Lát bưởi', 'Lát quýt', 'Lát cam'], 3, 'orange'),
  (6, 'Bề mặt này là gì?',                    array['Vỏ quả bơ', 'Vỏ dứa', 'Vỏ mít', 'Vỏ sầu riêng'], 1, 'pineapple')
) as v(sort, question, opts, ok, builtin)
where not exists (select 1 from public.cc_questions);
