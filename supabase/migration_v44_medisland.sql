-- ============================================================================
-- migration_v44_medisland.sql
-- MEDISLAND — đảo mô phỏng chiến dịch truyền thông (môn Media Strategy & Tactics).
--   • medis_classes : lớp học (mã lớp, học kỳ).
--   • medis_groups  : agency (nhóm) — mỗi nhóm một hòn đảo riêng: tên, màu, brand được giao,
--                     danh sách thành viên [{name, mssv}], mã vào đảo, số giờ mỗi lần chạy (mặc định 48).
--   • medis_state   : trạng thái của từng nhóm (kế hoạch đã chốt + thời điểm chốt, bản nháp & biểu quyết,
--                     bảng ý tưởng, nhật ký đóng góp, đánh giá đồng đội, điểm từng tuần).
--   • RPC (khách anon gọi được, SECURITY DEFINER):
--       medis_now()                      giờ máy chủ (ms)
--       medis_directory()                danh sách lớp → nhóm → tên thành viên (KHÔNG có MSSV, mã nhóm)
--       medis_act(group, mssv, code, op, data)  mọi thao tác của sinh viên, kiểm tra MSSV + mã nhóm
--       medis_board(class)               bảng xếp hạng lớp (chỉ điểm, không lộ kế hoạch)
--   • Chỉ tài khoản admin (thinh.dhl3105@gmail.com) đọc/sửa trực tiếp các bảng.
--   • Thời điểm chốt và hạn 48 giờ do MÁY CHỦ quyết định — sinh viên không tua được.
--
-- Chạy trong: Supabase Dashboard > SQL Editor > New query > dán toàn bộ > Run.
-- An toàn khi chạy lại nhiều lần.
-- ============================================================================

create table if not exists public.medis_classes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null,
  term        text not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists public.medis_groups (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.medis_classes(id) on delete cascade,
  name        text not null,
  color       text not null default '#ffd27a',
  brief       text not null default 'maytea',
  members     jsonb not null default '[]'::jsonb,
  join_code   text not null,
  run_hours   numeric not null default 48 check (run_hours > 0),
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists medis_groups_class_idx on public.medis_groups (class_id, sort, created_at);

create table if not exists public.medis_state (
  group_id    uuid primary key references public.medis_groups(id) on delete cascade,
  state       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.medis_classes enable row level security;
alter table public.medis_groups  enable row level security;
alter table public.medis_state   enable row level security;

drop policy if exists medis_classes_admin on public.medis_classes;
create policy medis_classes_admin on public.medis_classes for all to authenticated
  using ((auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com') with check ((auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com');
drop policy if exists medis_groups_admin on public.medis_groups;
create policy medis_groups_admin on public.medis_groups for all to authenticated
  using ((auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com') with check ((auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com');
drop policy if exists medis_state_admin on public.medis_state;
create policy medis_state_admin on public.medis_state for all to authenticated
  using ((auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com') with check ((auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com');

revoke all on public.medis_classes, public.medis_groups, public.medis_state from anon;
grant select, insert, update, delete on public.medis_classes, public.medis_groups, public.medis_state to authenticated;

-- ---------------------------------------------------------------- giờ máy chủ
create or replace function public.medis_now() returns bigint
language sql stable as $$ select (extract(epoch from clock_timestamp()) * 1000)::bigint $$;

-- ---------------------------------------------------------------- danh sách lớp (công khai, không MSSV)
create or replace function public.medis_directory() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'code', c.code, 'term', c.term,
    'groups', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id, 'name', g.name, 'color', g.color,
        'members', (select coalesce(jsonb_agg(jsonb_build_object('name', m->>'name')), '[]'::jsonb) from jsonb_array_elements(g.members) m)
      ) order by g.sort, g.created_at)
      from public.medis_groups g where g.class_id = c.id), '[]'::jsonb)
  ) order by c.created_at desc), '[]'::jsonb)
  from public.medis_classes c;
$$;

-- ---------------------------------------------------------------- bảng xếp hạng lớp (chỉ điểm)
create or replace function public.medis_board(p_class uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', g.id, 'name', g.name, 'color', g.color, 'brief', g.brief,
    'weeks', coalesce(jsonb_array_length(s.state -> 'launches'), 0),
    'scores', coalesce(s.state -> 'scores', '[]'::jsonb)
  ) order by g.sort, g.created_at), '[]'::jsonb)
  from public.medis_groups g left join public.medis_state s on s.group_id = g.id
  where g.class_id = p_class;
$$;

-- ---------------------------------------------------------------- thao tác của sinh viên
create or replace function public.medis_act(p_group uuid, p_mssv text, p_code text, p_op text, p_data jsonb default '{}'::jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  g       public.medis_groups;
  cls     public.medis_classes;
  s       jsonb;
  idx     integer;
  n       integer;
  k       integer;
  w       integer;
  nowms   bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  runms   bigint;
  d       jsonb;
  apps    jsonb;
  plan    jsonb;
  txt     text;
begin
  select * into g from public.medis_groups where id = p_group;
  if not found then return jsonb_build_object('ok', false, 'err', 'nogroup'); end if;
  if upper(trim(coalesce(p_code, ''))) <> upper(trim(g.join_code)) then return jsonb_build_object('ok', false, 'err', 'code'); end if;
  select (t.ord - 1)::int into idx
    from jsonb_array_elements(g.members) with ordinality as t(m, ord)
    where upper(trim(t.m ->> 'mssv')) = upper(trim(coalesce(p_mssv, ''))) limit 1;
  if idx is null then return jsonb_build_object('ok', false, 'err', 'mssv'); end if;
  select * into cls from public.medis_classes where id = g.class_id;

  insert into public.medis_state (group_id) values (p_group) on conflict (group_id) do nothing;
  select state into s from public.medis_state where group_id = p_group for update;
  s := coalesce(s, '{}'::jsonb);
  if s -> 'launches' is null then s := s || '{"launches": []}'::jsonb; end if;
  if s -> 'plans'    is null then s := s || '{"plans": {}}'::jsonb; end if;
  if s -> 'drafts'   is null then s := s || '{"drafts": {}}'::jsonb; end if;
  if s -> 'board'    is null then s := s || '{"board": []}'::jsonb; end if;
  if s -> 'log'      is null then s := s || '{"log": []}'::jsonb; end if;
  if s -> 'peer'     is null then s := s || '{"peer": {}}'::jsonb; end if;

  n := jsonb_array_length(g.members);
  k := jsonb_array_length(s -> 'launches');
  runms := (g.run_hours * 3600000)::bigint;

  if p_op = 'get' then
    null;

  elsif p_op in ('draft', 'approve', 'lock') then
    w := (p_data ->> 'w')::int;
    -- chỉ được làm tuần kế tiếp, sau khi tuần trước đã chạy đủ thời gian (không chạy lại)
    if w is null or w <> k or k >= 4 or (k > 0 and nowms < (s -> 'launches' ->> (k - 1))::bigint + runms) then
      return jsonb_build_object('ok', false, 'err', 'state');
    end if;
    if p_op = 'draft' then
      txt := left(coalesce(p_data ->> 'reason', ''), 4000);
      s := jsonb_set(s, array['drafts', w::text], jsonb_build_object(
        'plan', coalesce(p_data -> 'plan', '{}'::jsonb), 'reason', txt, 'by', idx, 'at', nowms, 'approvals', jsonb_build_array(idx)), true);
    elsif p_op = 'approve' then
      d := s -> 'drafts' -> w::text;
      if d is null then return jsonb_build_object('ok', false, 'err', 'nodraft'); end if;
      if (d ->> 'at')::bigint <> (p_data ->> 'at')::bigint then return jsonb_build_object('ok', false, 'err', 'stale'); end if;
      if not ((d -> 'approvals') @> to_jsonb(idx)) then
        s := jsonb_set(s, array['drafts', w::text, 'approvals'], (d -> 'approvals') || to_jsonb(idx), true);
      end if;
    else -- lock
      d := s -> 'drafts' -> w::text;
      if d is null then return jsonb_build_object('ok', false, 'err', 'nodraft'); end if;
      apps := d -> 'approvals';
      if jsonb_array_length(apps) < (n / 2) + 1 then return jsonb_build_object('ok', false, 'err', 'votes'); end if;
      if char_length(trim(coalesce(d ->> 'reason', ''))) < 60 then return jsonb_build_object('ok', false, 'err', 'reason'); end if;
      plan := coalesce(d -> 'plan', '{}'::jsonb) || jsonb_build_object(
        'reason', d ->> 'reason', 'by', idx, 'byName', g.members -> idx ->> 'name', 'approvals', apps, 'lockedAt', nowms);
      s := jsonb_set(s, array['plans', w::text], plan, true);
      s := jsonb_set(s, '{launches}', (s -> 'launches') || to_jsonb(nowms), true);
      s := jsonb_set(s, '{drafts}', (s -> 'drafts') - w::text, true);
    end if;

  elsif p_op = 'board_add' then
    txt := left(trim(coalesce(p_data ->> 'text', '')), 600);
    if char_length(txt) < 2 then return jsonb_build_object('ok', false, 'err', 'empty'); end if;
    s := jsonb_set(s, '{board}', (s -> 'board') || jsonb_build_array(jsonb_build_object(
      'm', idx, 't', nowms, 'w', coalesce((p_data ->> 'w')::int, 0), 'c', left(coalesce(p_data ->> 'c', '#ffe58a'), 9), 'text', txt)), true);
    if jsonb_array_length(s -> 'board') > 400 then s := jsonb_set(s, '{board}', (s -> 'board') - 0, true); end if;

  elsif p_op = 'board_del' then
    s := jsonb_set(s, '{board}', coalesce((
      select jsonb_agg(e) from jsonb_array_elements(s -> 'board') e
      where not ((e ->> 't')::bigint = (p_data ->> 't')::bigint and (e ->> 'm')::int = idx)), '[]'::jsonb), true);

  elsif p_op = 'peer' then
    s := jsonb_set(s, array['peer', idx::text], jsonb_build_object(
      'r', coalesce(p_data -> 'r', '{}'::jsonb), 'c', left(coalesce(p_data ->> 'c', ''), 1000), 't', nowms), true);

  elsif p_op = 'log' then
    s := jsonb_set(s, '{log}', (s -> 'log') || jsonb_build_array(jsonb_build_object(
      'm', idx, 'a', left(coalesce(p_data ->> 'a', ''), 20), 'x', left(coalesce(p_data ->> 'x', ''), 20), 't', nowms)), true);
    if jsonb_array_length(s -> 'log') > 4000 then s := jsonb_set(s, '{log}', (s -> 'log') - 0, true); end if;

  elsif p_op = 'score' then
    if jsonb_typeof(p_data -> 'weekly') = 'array' and jsonb_array_length(p_data -> 'weekly') <= 4 then
      s := jsonb_set(s, '{scores}', p_data -> 'weekly', true);
    end if;

  else
    return jsonb_build_object('ok', false, 'err', 'op');
  end if;

  if p_op <> 'get' then
    update public.medis_state set state = s, updated_at = now() where group_id = p_group;
  end if;

  return jsonb_build_object(
    'ok', true, 'me', idx, 'now', nowms,
    'state', case when p_op in ('log', 'score') then '{}'::jsonb else s end,
    'group', jsonb_build_object(
      'id', g.id, 'name', g.name, 'color', g.color, 'brief', g.brief, 'run_hours', g.run_hours,
      'class_id', g.class_id, 'class_code', cls.code,
      'members', (select coalesce(jsonb_agg(jsonb_build_object('name', m ->> 'name')), '[]'::jsonb) from jsonb_array_elements(g.members) m)));
end;
$$;

revoke all on function public.medis_act(uuid, text, text, text, jsonb) from public;
grant execute on function public.medis_now() to anon, authenticated;
grant execute on function public.medis_directory() to anon, authenticated;
grant execute on function public.medis_board(uuid) to anon, authenticated;
grant execute on function public.medis_act(uuid, text, text, text, jsonb) to anon, authenticated;
