-- ============================================================================
-- migration_v52_metrogram.sql
-- METROGRAM — mạng xã hội dưới ga B1 Main City Central (môn Social Media Marketing).
--   • mg_classes : lớp (mã lớp, học kỳ, ngày bắt đầu, số ngày — mặc định 7).
--   • mg_groups  : nhóm — thương hiệu + guideline (brand jsonb), thành viên [{name, mssv, out}], mã nhóm.
--   • mg_posts   : mỗi nhóm 1 hook / ngày. Kết quả khách đi tàu (sim) do MÁY CHỦ tính khi đăng.
--   • mg_reacts  : thả tim / chia sẻ thật trên website (thành viên Knoworld hoặc khách).
--   • Điểm ngày = khách đi tàu + website + điểm giảng viên (ẩn). Sinh viên chỉ nhận TỔNG, sau 24:00.
--   • RPC (anon gọi được, SECURITY DEFINER): mg_login, mg_me, mg_post, mg_feed, mg_react, mg_board, mg_featured.
--   • Chỉ tài khoản admin (thinh.dhl3105@gmail.com) đọc/sửa trực tiếp các bảng + mg_admin_*.
--   • Ngày, giờ đăng, giờ chốt do MÁY CHỦ quyết định theo giờ Việt Nam.
--
-- Chạy trong: Supabase Dashboard > SQL Editor > New query > dán toàn bộ > Run.
-- An toàn khi chạy lại nhiều lần.
-- ============================================================================

create table if not exists public.mg_classes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null,
  term        text not null default '',
  start_date  date,
  days        integer not null default 7 check (days between 1 and 30),
  created_at  timestamptz not null default now()
);

create table if not exists public.mg_groups (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.mg_classes(id) on delete cascade,
  name        text not null,
  color       text not null default '#ff8fb1',
  brand       jsonb not null default '{}'::jsonb,
  members     jsonb not null default '[]'::jsonb,
  join_code   text not null,
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists mg_groups_class_idx on public.mg_groups (class_id, sort, created_at);

create table if not exists public.mg_posts (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.mg_groups(id) on delete cascade,
  day         integer not null check (day >= 1),
  text        text not null,
  tone        text not null,
  tech        text[] not null default '{}',
  extra       text[] not null default '{}',
  slot        text not null check (slot in ('morning', 'noon', 'evening', 'late')),
  flags       text[] not null default '{}',
  gv_stars    integer not null default 0 check (gv_stars between 0 and 5),
  featured    boolean not null default false,
  by_name     text,
  sim         jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  unique (group_id, day)
);

create table if not exists public.mg_reacts (
  post_id     uuid not null references public.mg_posts(id) on delete cascade,
  actor       text not null,
  kind        text not null check (kind in ('member', 'guest')),
  liked       boolean not null default false,
  shared      boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (post_id, actor)
);

alter table public.mg_classes enable row level security;
alter table public.mg_groups  enable row level security;
alter table public.mg_posts   enable row level security;
alter table public.mg_reacts  enable row level security;

drop policy if exists mg_classes_admin on public.mg_classes;
create policy mg_classes_admin on public.mg_classes for all to authenticated
  using ((auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com') with check ((auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com');
drop policy if exists mg_groups_admin on public.mg_groups;
create policy mg_groups_admin on public.mg_groups for all to authenticated
  using ((auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com') with check ((auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com');
drop policy if exists mg_posts_admin on public.mg_posts;
create policy mg_posts_admin on public.mg_posts for all to authenticated
  using ((auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com') with check ((auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com');
drop policy if exists mg_reacts_admin on public.mg_reacts;
create policy mg_reacts_admin on public.mg_reacts for all to authenticated
  using ((auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com') with check ((auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com');

revoke all on public.mg_classes, public.mg_groups, public.mg_posts, public.mg_reacts from anon;
grant select, insert, update, delete on public.mg_classes, public.mg_groups, public.mg_posts, public.mg_reacts to authenticated;

-- ============================================================================ hằng số & tiện ích
create or replace function public.mg_is_admin() returns boolean
language sql stable as $$ select coalesce(auth.jwt() ->> 'email', '') = 'thinh.dhl3105@gmail.com' $$;

create or replace function public.mg_now_ms() returns bigint
language sql stable as $$ select (extract(epoch from clock_timestamp()) * 1000)::bigint $$;

create or replace function public.mg_vn_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Ho_Chi_Minh')::date $$;

create or replace function public.mg_today(p_start date) returns integer
language sql stable as $$ select case when p_start is null then 0 else (public.mg_vn_today() - p_start + 1) end $$;

create or replace function public.mg_slot_hour(p_slot text) returns integer
language sql immutable as $$ select case p_slot when 'morning' then 7 when 'noon' then 12 when 'evening' then 20 when 'late' then 23 else 0 end $$;

create or replace function public.mg_visible_at(p_start date, p_day integer, p_slot text) returns timestamptz
language sql immutable as $$
  select ((p_start + p_day - 1)::timestamp + make_interval(hours => public.mg_slot_hour(p_slot))) at time zone 'Asia/Ho_Chi_Minh'
$$;

create or replace function public.mg_close_at(p_start date, p_day integer) returns timestamptz
language sql immutable as $$ select ((p_start + p_day)::timestamp) at time zone 'Asia/Ho_Chi_Minh' $$;

-- 6 nhóm khách đi tàu: tỉ lệ, độ hay chia sẻ, độ dài hook ưa thích, sở thích theo nhãn và khung giờ.
create or replace function public.mg_segs() returns jsonb
language sql immutable as $$ select '[
 {"id":"genz","mix":0.26,"shareK":1.4,"len":"short",
  "pref":{"humor":1,"emotion":0.3,"luxury":-0.6,"direct":0.1,"question":0.5,"number":0.1,"curiosity":0.8,"pain":0.3,"fomo":0.6,"story":0.3,"cta":-0.1,"emoji":0.6,"slang":0.9},
  "time":{"morning":-0.4,"noon":0.3,"evening":0.6,"late":0.8}},
 {"id":"office","mix":0.22,"shareK":0.9,"len":"mid",
  "pref":{"humor":0.4,"emotion":0.1,"luxury":0.2,"direct":0.7,"question":0.3,"number":0.8,"curiosity":0.3,"pain":0.7,"fomo":0.1,"story":0.2,"cta":0.4,"emoji":0,"slang":-0.3},
  "time":{"morning":0.5,"noon":0.8,"evening":0.3,"late":-0.4}},
 {"id":"mom","mix":0.14,"shareK":1.3,"len":"long",
  "pref":{"humor":0.1,"emotion":0.9,"luxury":-0.2,"direct":0.3,"question":0.4,"number":0.4,"curiosity":0.1,"pain":0.8,"fomo":0.3,"story":0.8,"cta":0.3,"emoji":0.2,"slang":-0.6},
  "time":{"morning":0.2,"noon":0.6,"evening":0.3,"late":0.7}},
 {"id":"mid","mix":0.14,"shareK":1.1,"len":"long",
  "pref":{"humor":-0.1,"emotion":0.6,"luxury":0.5,"direct":0.7,"question":-0.1,"number":0.5,"curiosity":-0.3,"pain":0.4,"fomo":-0.4,"story":0.6,"cta":0.2,"emoji":-0.4,"slang":-0.9},
  "time":{"morning":0.8,"noon":0.3,"evening":0.5,"late":-0.7}},
 {"id":"tech","mix":0.12,"shareK":1.0,"len":"short",
  "pref":{"humor":0.6,"emotion":-0.3,"luxury":-0.3,"direct":0.5,"question":0.4,"number":0.9,"curiosity":0.7,"pain":0.3,"fomo":-0.2,"story":-0.1,"cta":-0.1,"emoji":0.1,"slang":0.3},
  "time":{"morning":-0.2,"noon":0.2,"evening":0.5,"late":0.9}},
 {"id":"fit","mix":0.12,"shareK":1.0,"len":"mid",
  "pref":{"humor":0.3,"emotion":0.4,"luxury":-0.1,"direct":0.6,"question":0.2,"number":0.7,"curiosity":0.3,"pain":0.6,"fomo":0.4,"story":0.4,"cta":0.5,"emoji":0.3,"slang":0.2},
  "time":{"morning":0.9,"noon":0.1,"evening":0.6,"late":-0.5}}
]'::jsonb $$;

-- số ngẫu nhiên tất định trong [0,1) theo hạt giống (cùng hook → cùng kết quả)
create or replace function public.mg_rand(p_seed text, p_i integer) returns float8
language sql immutable as $$
  select (('x' || lpad(substr(md5(p_seed || ':' || p_i), 1, 13), 16, '0'))::bit(64)::bigint)::float8 / 4503599627370496.0
$$;

-- nhãn kiểm tra được: trả về lý do nếu hook không có thứ nhãn khai báo
create or replace function public.mg_tag_fail(p_tag text, p_text text) returns text
language sql immutable as $$
  select case p_tag
    when 'question' then case when p_text ~ '[?？]' then null else 'hook không có dấu “?”' end
    when 'number'   then case when p_text ~ '[0-9]' then null else 'hook không có con số' end
    when 'emoji'    then case when p_text ~ '[\U0001F000-\U0001FAFF☀-➿⭐⭕⬆⬇⤴⤵〰〽]' then null else 'hook không có emoji' end
    when 'cta'      then case when lower(p_text) ~* '(ngay|thử|mua|đặt|đăng ký|inbox|ghé|click|săn|nhận|tải|order|comment|bình luận|tag|chia sẻ|share|follow|xem thêm)' then null
                          else 'không thấy lời kêu gọi hành động (ngay, thử, đặt, ghé…)' end
    when 'slang'    then case when lower(p_text) ~* '(xỉu|đỉnh|chill|flex|slay|keo|mlem|real|vibe|crush|khum|hem|ủa|dữ vậy|u là trời|pov|ét o ét|hết nước chấm|xịn|cháy|gét gô|over hợp|quá trời)' then null
                          else 'không thấy từ ngữ Gen Z' end
    else null end
$$;

-- ============================================================================ mô phỏng khách đi tàu
create or replace function public.mg_sim(p_group uuid, p_day integer, p_text text, p_tone text, p_tech text[], p_extra text[], p_slot text, p_flags text[])
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  b        jsonb;
  s        jsonb;
  t        text;
  why      text;
  lowt     text := lower(coalesce(p_text, ''));
  L        integer := char_length(coalesce(p_text, ''));
  tags     text[] := array[p_tone] || coalesce(p_tech, '{}') || coalesce(p_extra, '{}');
  valid    text[] := '{}';
  dropped  jsonb := '[]'::jsonb;
  issues   jsonb := '[]'::jsonb;
  gvflags  integer := 0;
  banned   boolean := false;
  fatigue  boolean := false;
  mention  boolean := false;
  ptone    text;
  ptech    text[];
  seed     text := p_group::text || '|' || p_day || '|' || coalesce(p_text, '');
  i        integer := 0;
  a        float8;
  pl       float8;
  ps       float8;
  n        integer;
  lk       integer;
  sh       integer;
  ta       boolean;
  per      jsonb := '[]'::jsonb;
  likeTA   integer := 0; likeOff integer := 0; shareTA integer := 0; shareOff integer := 0;
  mult     float8;
  raw      float8;
  tot      integer;
begin
  select coalesce(brand, '{}'::jsonb) into b from public.mg_groups where id = p_group;
  b := coalesce(b, '{}'::jsonb);

  foreach t in array tags loop
    if t = any(coalesce(p_flags, '{}')) then
      dropped := dropped || jsonb_build_object('id', t, 'gv', true); gvflags := gvflags + 1;
    else
      why := public.mg_tag_fail(t, coalesce(p_text, ''));
      if why is not null then dropped := dropped || jsonb_build_object('id', t, 'why', why);
      else valid := valid || t; end if;
    end if;
  end loop;

  for t in select jsonb_array_elements_text(coalesce(b -> 'banned', '[]'::jsonb)) loop
    if char_length(trim(t)) > 0 and position(lower(trim(t)) in lowt) > 0 then
      issues := issues || jsonb_build_object('k', 'banned', 'w', trim(t)); banned := true;
    end if;
  end loop;
  if not (coalesce(b -> 'tones', '[]'::jsonb) ? p_tone) then
    issues := issues || jsonb_build_object('k', 'tone', 'tone', p_tone);
  end if;

  select tone, tech into ptone, ptech from public.mg_posts where group_id = p_group and day = p_day - 1;
  if found and ptone = p_tone and ptech @> coalesce(p_tech, '{}') and ptech <@ coalesce(p_tech, '{}') then fatigue := true; end if;
  mention := char_length(coalesce(b ->> 'brand', '')) > 0 and position(lower(b ->> 'brand') in lowt) > 0;

  for s in select e from jsonb_array_elements(public.mg_segs()) e loop
    a := 0;
    if p_tone = any(valid) then a := a + coalesce((s -> 'pref' ->> p_tone)::float8, 0); end if;
    foreach t in array coalesce(p_tech, '{}') loop
      if t = any(valid) then a := a + 0.7 * coalesce((s -> 'pref' ->> t)::float8, 0); end if;
    end loop;
    foreach t in array coalesce(p_extra, '{}') loop
      if t = any(valid) then a := a + 0.4 * coalesce((s -> 'pref' ->> t)::float8, 0); end if;
    end loop;
    a := a + 0.6 * coalesce((s -> 'time' ->> p_slot)::float8, 0);
    a := a + case s ->> 'len'
               when 'short' then case when L <= 70 then 0.25 when L > 110 then -0.35 else 0 end
               when 'mid'   then case when L > 130 then -0.2 else 0 end
               else case when L >= 60 then 0.15 else -0.1 end end;
    if fatigue then a := a - 0.45; end if;
    if banned  then a := a - 0.6;  end if;
    if mention then a := a + 0.15; end if;
    a := a + (public.mg_rand(seed, i * 10) - 0.5) * 0.5;
    pl := 0.03 + 0.42 / (1 + exp(-1.8 * (a - 0.9)));
    ps := pl * (0.08 + 0.32 / (1 + exp(-2 * (a - 1.6)))) * (s ->> 'shareK')::float8;
    n  := round(600 * (s ->> 'mix')::float8);
    lk := round(n * pl * (0.9 + 0.2 * public.mg_rand(seed, i * 10 + 1)));
    sh := least(lk, round(n * ps * (0.85 + 0.3 * public.mg_rand(seed, i * 10 + 2)))::integer);
    ta := coalesce(b -> 'ta', '[]'::jsonb) ? (s ->> 'id');
    per := per || jsonb_build_object('id', s ->> 'id', 'n', n, 'pLike', round(pl::numeric, 4), 'pShare', round(ps::numeric, 4),
                                     'like', lk, 'share', sh, 'ta', ta);
    if ta then likeTA := likeTA + lk; shareTA := shareTA + sh; else likeOff := likeOff + lk; shareOff := shareOff + sh; end if;
    i := i + 1;
  end loop;

  mult := greatest(0.4, 1 - 0.15 * jsonb_array_length(issues) - 0.1 * gvflags);
  raw  := likeTA + 0.2 * likeOff + 3 * shareTA + 0.5 * shareOff;
  tot  := likeTA + likeOff + shareTA + shareOff;
  return jsonb_build_object(
    'per', per, 'likeTA', likeTA, 'likeOff', likeOff, 'shareTA', shareTA, 'shareOff', shareOff,
    'pctTA', case when tot > 0 then round(100.0 * (likeTA + shareTA) / tot) else 0 end,
    'mult', round(mult::numeric, 2), 'npc', round(raw * mult),
    'valid', to_jsonb(valid), 'dropped', dropped, 'issues', issues, 'fatigue', fatigue, 'mention', mention);
end;
$$;

create or replace function public.mg_posts_sim() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.sim := public.mg_sim(new.group_id, new.day, new.text, new.tone, new.tech, new.extra, new.slot, new.flags);
  return new;
end;
$$;
drop trigger if exists mg_posts_sim on public.mg_posts;
create trigger mg_posts_sim before insert or update of text, tone, tech, extra, slot, flags on public.mg_posts
  for each row execute function public.mg_posts_sim();

-- ============================================================================ điểm
create or replace function public.mg_web(p_post uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'memLike',    count(*) filter (where kind = 'member' and liked),
    'memShare',   count(*) filter (where kind = 'member' and shared),
    'guestLike',  count(*) filter (where kind = 'guest'  and liked),
    'guestShare', count(*) filter (where kind = 'guest'  and shared))
  from public.mg_reacts where post_id = p_post
$$;

-- Trọng số website: thành viên ❤️×2 🔁×4, khách ❤️×1 🔁×2 (nhân hệ số guideline). Mỗi ★ GV = +10.
create or replace function public.mg_web_pts(p_web jsonb, p_mult numeric) returns integer
language sql immutable as $$
  select round((2 * (p_web ->> 'memLike')::int + 4 * (p_web ->> 'memShare')::int
              + (p_web ->> 'guestLike')::int + 2 * (p_web ->> 'guestShare')::int) * coalesce(p_mult, 1))::int
$$;

-- Một bài đăng dưới dạng JSON. p_admin = true: thêm phần điểm tách riêng + sao GV.
create or replace function public.mg_post_view(p public.mg_posts, p_start date, p_admin boolean) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  vis     timestamptz := public.mg_visible_at(p_start, p.day, p.slot);
  cls     timestamptz := public.mg_close_at(p_start, p.day);
  closed  boolean := now() >= cls;
  prog    float8;
  e       float8;
  sim     jsonb := p.sim;
  web     jsonb := public.mg_web(p.id);
  npc     integer := coalesce((p.sim ->> 'npc')::int, 0);
  wp      integer := public.mg_web_pts(public.mg_web(p.id), (p.sim ->> 'mult')::numeric);
  gp      integer := p.gv_stars * 10;
  res     jsonb;
begin
  prog := greatest(0, least(1, extract(epoch from (now() - vis)) / greatest(1, extract(epoch from (cls - vis)))));
  if not closed then
    e := 1 - power(1 - prog, 2);
    sim := sim || jsonb_build_object(
      'per', coalesce((select jsonb_agg(x || jsonb_build_object('like', round((x ->> 'like')::numeric * e), 'share', round((x ->> 'share')::numeric * e)))
                       from jsonb_array_elements(p.sim -> 'per') x), '[]'::jsonb),
      'likeTA', round((p.sim ->> 'likeTA')::numeric * e), 'likeOff', round((p.sim ->> 'likeOff')::numeric * e),
      'shareTA', round((p.sim ->> 'shareTA')::numeric * e), 'shareOff', round((p.sim ->> 'shareOff')::numeric * e));
    sim := sim - 'npc';
  end if;
  res := jsonb_build_object(
    'id', p.id, 'group_id', p.group_id, 'day', p.day, 'text', p.text, 'tone', p.tone, 'tech', to_jsonb(p.tech), 'extra', to_jsonb(p.extra),
    'slot', p.slot, 'by', p.by_name, 'created_at', p.created_at, 'featured', p.featured,
    'visible_at', (extract(epoch from vis) * 1000)::bigint, 'close_at', (extract(epoch from cls) * 1000)::bigint,
    'progress', round(prog::numeric, 4), 'closed', closed, 'sim', sim, 'web', web,
    'total', case when closed then npc + wp + gp else null end);
  if not p_admin then
    res := jsonb_set(res, '{sim}', (res -> 'sim') - 'npc');
  end if;
  if p_admin then
    res := res || jsonb_build_object('flags', to_jsonb(p.flags), 'gv_stars', p.gv_stars, 'npcPts', npc, 'webPts', wp, 'gvPts', gp,
                                     'totalLive', npc + wp + gp, 'simFull', p.sim);
  end if;
  return res;
end;
$$;

-- ============================================================================ đăng nhập & nhóm của tôi
create or replace function public.mg_member_idx(p_members jsonb, p_mssv text) returns integer
language sql immutable as $$
  select (t.ord - 1)::int from jsonb_array_elements(p_members) with ordinality as t(m, ord)
   where upper(trim(t.m ->> 'mssv')) = upper(trim(coalesce(p_mssv, '')))
     and not coalesce((t.m ->> 'out')::boolean, false) and trim(coalesce(p_mssv, '')) <> '' limit 1
$$;

create or replace function public.mg_login(p_mssv text, p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare gid uuid;
begin
  select g.id into gid from public.mg_groups g
   where upper(trim(g.join_code)) = upper(trim(coalesce(p_code, '')))
     and public.mg_member_idx(g.members, p_mssv) is not null
   order by g.created_at desc limit 1;
  if gid is null then return jsonb_build_object('ok', false, 'err', 'notfound'); end if;
  return jsonb_build_object('ok', true, 'group', gid);
end;
$$;

create or replace function public.mg_me(p_group uuid, p_mssv text, p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  g    public.mg_groups;
  c    public.mg_classes;
  idx  integer;
begin
  select * into g from public.mg_groups where id = p_group;
  if not found then return jsonb_build_object('ok', false, 'err', 'nogroup'); end if;
  if upper(trim(coalesce(p_code, ''))) <> upper(trim(g.join_code)) then return jsonb_build_object('ok', false, 'err', 'code'); end if;
  idx := public.mg_member_idx(g.members, p_mssv);
  if idx is null then return jsonb_build_object('ok', false, 'err', 'mssv'); end if;
  select * into c from public.mg_classes where id = g.class_id;
  return jsonb_build_object(
    'ok', true, 'now', public.mg_now_ms(), 'today', public.mg_today(c.start_date), 'days', c.days, 'start', c.start_date,
    'hour', extract(hour from now() at time zone 'Asia/Ho_Chi_Minh')::int,
    'group', jsonb_build_object('id', g.id, 'name', g.name, 'color', g.color, 'brand', g.brand,
      'class_id', c.id, 'class_code', c.code, 'me', idx, 'meName', g.members -> idx ->> 'name',
      'members', (select coalesce(jsonb_agg(m ->> 'name'), '[]'::jsonb) from jsonb_array_elements(g.members) m where not coalesce((m ->> 'out')::boolean, false))),
    'posts', coalesce((select jsonb_agg(public.mg_post_view(p, c.start_date, false) order by p.day)
                        from public.mg_posts p where p.group_id = g.id), '[]'::jsonb));
end;
$$;

-- ============================================================================ đăng hook (1 lần / ngày)
create or replace function public.mg_post(p_group uuid, p_mssv text, p_code text, p_text text, p_tone text, p_tech text[], p_extra text[], p_slot text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  g     public.mg_groups;
  c     public.mg_classes;
  idx   integer;
  today integer;
  txt   text := trim(coalesce(p_text, ''));
  tech  text[];
  extra text[];
begin
  select * into g from public.mg_groups where id = p_group;
  if not found then return jsonb_build_object('ok', false, 'err', 'nogroup'); end if;
  if upper(trim(coalesce(p_code, ''))) <> upper(trim(g.join_code)) then return jsonb_build_object('ok', false, 'err', 'code'); end if;
  idx := public.mg_member_idx(g.members, p_mssv);
  if idx is null then return jsonb_build_object('ok', false, 'err', 'mssv'); end if;
  select * into c from public.mg_classes where id = g.class_id;
  today := public.mg_today(c.start_date);
  if today < 1 or today > c.days then return jsonb_build_object('ok', false, 'err', 'notopen'); end if;
  if exists (select 1 from public.mg_posts where group_id = g.id and day = today) then return jsonb_build_object('ok', false, 'err', 'posted'); end if;
  if char_length(txt) < 10 or char_length(txt) > 150 then return jsonb_build_object('ok', false, 'err', 'length'); end if;
  if p_tone is null or p_tone not in ('humor', 'emotion', 'luxury', 'direct') then return jsonb_build_object('ok', false, 'err', 'tone'); end if;
  select coalesce(array_agg(distinct x), '{}') into tech  from unnest(coalesce(p_tech, '{}'))  x where x in ('question', 'number', 'curiosity', 'pain', 'fomo', 'story');
  select coalesce(array_agg(distinct x), '{}') into extra from unnest(coalesce(p_extra, '{}')) x where x in ('cta', 'emoji', 'slang');
  if cardinality(tech) < 1 or cardinality(tech) > 2 then return jsonb_build_object('ok', false, 'err', 'tech'); end if;
  if p_slot is null or p_slot not in ('morning', 'noon', 'evening', 'late') then return jsonb_build_object('ok', false, 'err', 'slot'); end if;
  if public.mg_slot_hour(p_slot) <= extract(hour from now() at time zone 'Asia/Ho_Chi_Minh') then return jsonb_build_object('ok', false, 'err', 'slotpast'); end if;
  insert into public.mg_posts (group_id, day, text, tone, tech, extra, slot, by_name)
  values (g.id, today, txt, p_tone, tech, extra, p_slot, g.members -> idx ->> 'name');
  return public.mg_me(p_group, p_mssv, p_code);
end;
$$;

-- ============================================================================ bảng tin + thả tim / chia sẻ
-- người tương tác: MSSV hợp lệ (danh sách MSSV Knoworld hoặc thành viên nhóm MetroGram) = thành viên; còn lại = khách (anon id)
create or replace function public.mg_actor(p_mssv text, p_anon text) returns text
language plpgsql stable security definer set search_path = public as $$
declare m text := upper(trim(coalesce(p_mssv, '')));
begin
  if m <> '' and (exists (select 1 from public.approved_students where student_id = m)
               or exists (select 1 from public.mg_groups g where public.mg_member_idx(g.members, m) is not null)) then
    return 'm:' || m;
  end if;
  if char_length(trim(coalesce(p_anon, ''))) >= 8 then return 'g:' || left(trim(p_anon), 64); end if;
  return null;
end;
$$;

create or replace function public.mg_feed(p_mssv text, p_code text, p_anon text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_actor text := public.mg_actor(p_mssv, p_anon);
  m     text := upper(trim(coalesce(p_mssv, '')));
  lg    public.mg_groups;
  lc    public.mg_classes;
  t     integer;
begin
  -- nhóm chưa đăng hook hôm nay thì chưa xem được bảng tin
  if trim(coalesce(p_code, '')) <> '' then
    select g.* into lg from public.mg_groups g
     where upper(trim(g.join_code)) = upper(trim(p_code)) and public.mg_member_idx(g.members, m) is not null
     order by g.created_at desc limit 1;
    if found then
      select * into lc from public.mg_classes where id = lg.class_id;
      t := public.mg_today(lc.start_date);
      if t between 1 and lc.days and not exists (select 1 from public.mg_posts where group_id = lg.id and day = t) then
        return jsonb_build_object('ok', true, 'locked', true, 'posts', '[]'::jsonb);
      end if;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'locked', false, 'actor', v_actor is not null, 'member', coalesce(v_actor like 'm:%', false),
    'posts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'day', p.day, 'text', p.text, 'slot', p.slot, 'class_code', c.code,
        'group', g.name, 'color', g.color, 'brand', coalesce(g.brand ->> 'brand', g.name),
        'likes', (select count(*) from public.mg_reacts r where r.post_id = p.id and r.liked),
        'shares', (select count(*) from public.mg_reacts r where r.post_id = p.id and r.shared),
        'liked', coalesce((select r.liked from public.mg_reacts r where r.post_id = p.id and r.actor = v_actor), false),
        'shared', coalesce((select r.shared from public.mg_reacts r where r.post_id = p.id and r.actor = v_actor), false),
        'mine', public.mg_member_idx(g.members, m) is not null,
        'visible_at', (extract(epoch from public.mg_visible_at(c.start_date, p.day, p.slot)) * 1000)::bigint
      ) order by md5(p.id::text || public.mg_vn_today()::text))
      from public.mg_posts p join public.mg_groups g on g.id = p.group_id join public.mg_classes c on c.id = g.class_id
      where c.start_date is not null and p.day = public.mg_today(c.start_date)
        and now() >= public.mg_visible_at(c.start_date, p.day, p.slot)
        and now() <  public.mg_close_at(c.start_date, p.day)), '[]'::jsonb));
end;
$$;

create or replace function public.mg_react(p_post uuid, p_op text, p_mssv text, p_anon text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_actor text := public.mg_actor(p_mssv, p_anon);
  p     public.mg_posts;
  g     public.mg_groups;
  c     public.mg_classes;
begin
  if v_actor is null then return jsonb_build_object('ok', false, 'err', 'noactor'); end if;
  select * into p from public.mg_posts where id = p_post;
  if not found then return jsonb_build_object('ok', false, 'err', 'nopost'); end if;
  select * into g from public.mg_groups where id = p.group_id;
  select * into c from public.mg_classes where id = g.class_id;
  if now() < public.mg_visible_at(c.start_date, p.day, p.slot) or now() >= public.mg_close_at(c.start_date, p.day) then
    return jsonb_build_object('ok', false, 'err', 'closed');
  end if;
  if v_actor like 'm:%' and public.mg_member_idx(g.members, substr(v_actor, 3)) is not null then
    return jsonb_build_object('ok', false, 'err', 'own');
  end if;
  insert into public.mg_reacts (post_id, actor, kind) values (p.id, v_actor, case when v_actor like 'm:%' then 'member' else 'guest' end)
    on conflict (post_id, actor) do nothing;
  if p_op = 'like' then update public.mg_reacts set liked = true, updated_at = now() where post_id = p.id and mg_reacts.actor = v_actor;
  elsif p_op = 'unlike' then update public.mg_reacts set liked = false, updated_at = now() where post_id = p.id and mg_reacts.actor = v_actor;
  elsif p_op = 'share' then update public.mg_reacts set shared = true, updated_at = now() where post_id = p.id and mg_reacts.actor = v_actor;
  else return jsonb_build_object('ok', false, 'err', 'op'); end if;
  return jsonb_build_object('ok', true,
    'likes',  (select count(*) from public.mg_reacts r where r.post_id = p.id and r.liked),
    'shares', (select count(*) from public.mg_reacts r where r.post_id = p.id and r.shared),
    'liked',  (select r.liked  from public.mg_reacts r where r.post_id = p.id and r.actor = v_actor),
    'shared', (select r.shared from public.mg_reacts r where r.post_id = p.id and r.actor = v_actor));
end;
$$;

-- ============================================================================ bảng xếp hạng (chỉ tổng điểm các ngày đã chốt)
create or replace function public.mg_board(p_class uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  c     public.mg_classes;
  g     public.mg_groups;
  p     public.mg_posts;
  rows  jsonb := '[]'::jsonb;
  tot   integer; pct numeric; npct integer; streak integer; today integer; d integer; lastd integer;
  v     jsonb;
begin
  select * into c from public.mg_classes where id = p_class;
  if not found then return jsonb_build_object('ok', false); end if;
  today := public.mg_today(c.start_date);
  lastd := least(today, c.days);
  for g in select * from public.mg_groups where class_id = c.id order by sort, created_at loop
    tot := 0; pct := 0; npct := 0; streak := 0;
    for p in select * from public.mg_posts where group_id = g.id order by day loop
      v := public.mg_post_view(p, c.start_date, false);
      if (v ->> 'closed')::boolean then
        tot := tot + coalesce((v ->> 'total')::int, 0);
        pct := pct + coalesce((p.sim ->> 'pctTA')::numeric, 0); npct := npct + 1;
      end if;
    end loop;
    -- chuỗi ngày đăng liên tục tính tới hôm nay (hôm nay chưa đăng thì vẫn giữ chuỗi tới hôm qua)
    d := lastd;
    if d >= 1 and not exists (select 1 from public.mg_posts where group_id = g.id and day = d) and d = today then d := d - 1; end if;
    while d >= 1 and exists (select 1 from public.mg_posts where group_id = g.id and day = d) loop streak := streak + 1; d := d - 1; end loop;
    rows := rows || jsonb_build_object('id', g.id, 'name', g.name, 'color', g.color, 'brand', coalesce(g.brand ->> 'brand', g.name),
      'total', tot, 'avgPct', case when npct > 0 then round(pct / npct) else 0 end, 'streak', streak,
      'postedToday', exists (select 1 from public.mg_posts where group_id = g.id and day = today));
  end loop;
  return jsonb_build_object('ok', true, 'class', jsonb_build_object('id', c.id, 'code', c.code, 'term', c.term, 'today', today, 'days', c.days), 'rows', rows);
end;
$$;

-- lớp đang chạy (cho khách xem bảng xếp hạng)
create or replace function public.mg_classes_live() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'code', c.code, 'term', c.term, 'today', public.mg_today(c.start_date), 'days', c.days)
                  order by c.created_at desc), '[]'::jsonb)
  from public.mg_classes c where c.start_date is not null and public.mg_today(c.start_date) between 1 and c.days + 7
$$;

-- hook được giảng viên chọn → hiện trên 2 màn hình Metro Ad Wall trong ga MetroGram
create or replace function public.mg_featured() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x ->> 'at' desc), '[]'::jsonb) from (
    select jsonb_build_object('text', p.text, 'brand', coalesce(g.brand ->> 'brand', g.name), 'group', g.name, 'day', p.day, 'at', p.created_at) x
    from public.mg_posts p join public.mg_groups g on g.id = p.group_id join public.mg_classes c on c.id = g.class_id
    where p.featured and c.start_date is not null and now() >= public.mg_visible_at(c.start_date, p.day, p.slot)
    order by p.created_at desc limit 12) s
$$;

-- ============================================================================ giảng viên
create or replace function public.mg_admin_posts(p_class uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c public.mg_classes;
begin
  if not public.mg_is_admin() then raise exception 'not admin'; end if;
  select * into c from public.mg_classes where id = p_class;
  if not found then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(public.mg_post_view(p, c.start_date, true) order by p.day, g.sort)
                   from public.mg_posts p join public.mg_groups g on g.id = p.group_id where g.class_id = c.id), '[]'::jsonb);
end;
$$;

-- tính lại kết quả khách đi tàu (sau khi sửa guideline / tệp khách của nhóm)
create or replace function public.mg_admin_resim(p_group uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.mg_is_admin() then raise exception 'not admin'; end if;
  update public.mg_posts set flags = flags where group_id = p_group;
end;
$$;

-- ============================================================================ quyền gọi hàm
revoke execute on function public.mg_sim(uuid, integer, text, text, text[], text[], text, text[]) from public, anon, authenticated;
revoke execute on function public.mg_post_view(public.mg_posts, date, boolean) from public, anon, authenticated;
revoke execute on function public.mg_actor(text, text) from public, anon, authenticated;
revoke execute on function public.mg_web(uuid) from public, anon, authenticated;
grant execute on function public.mg_login(text, text) to anon, authenticated;
grant execute on function public.mg_me(uuid, text, text) to anon, authenticated;
grant execute on function public.mg_post(uuid, text, text, text, text, text[], text[], text) to anon, authenticated;
grant execute on function public.mg_feed(text, text, text) to anon, authenticated;
grant execute on function public.mg_react(uuid, text, text, text) to anon, authenticated;
grant execute on function public.mg_board(uuid) to anon, authenticated;
grant execute on function public.mg_classes_live() to anon, authenticated;
grant execute on function public.mg_featured() to anon, authenticated;
grant execute on function public.mg_now_ms() to anon, authenticated;
grant execute on function public.mg_admin_posts(uuid) to authenticated;
grant execute on function public.mg_admin_resim(uuid) to authenticated;
