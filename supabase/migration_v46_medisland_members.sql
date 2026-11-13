-- ============================================================================
-- v46 — Medisland: nhóm linh hoạt (1 người trở lên, không giới hạn) + thêm/bớt thành viên
--   • Thành viên bị cho rời nhóm được đánh dấu out = true (giữ lịch sử đóng góp, không đăng nhập được).
--   • Biểu quyết đa số chỉ tính thành viên còn trong nhóm.
-- Chạy SAU v44 và v45. An toàn khi chạy lại.
-- ============================================================================

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
    where upper(trim(t.m ->> 'mssv')) = upper(trim(coalesce(p_mssv, '')))
      and not coalesce((t.m ->> 'out')::boolean, false) and trim(coalesce(p_mssv, '')) <> '' limit 1;
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

  -- chỉ đếm thành viên còn trong nhóm (giảng viên có thể cho thành viên rời nhóm: out = true)
  select count(*) into n from jsonb_array_elements(g.members) m where not coalesce((m ->> 'out')::boolean, false);
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
      if (select count(*) from jsonb_array_elements(apps) a
          where not coalesce((g.members -> (a #>> '{}')::int ->> 'out')::boolean, false)) < (n / 2) + 1 then return jsonb_build_object('ok', false, 'err', 'votes'); end if;
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
      'members', (select coalesce(jsonb_agg(jsonb_build_object('name', m ->> 'name', 'out', coalesce((m ->> 'out')::boolean, false))), '[]'::jsonb) from jsonb_array_elements(g.members) m)));
end;
$$;

revoke all on function public.medis_act(uuid, text, text, text, jsonb) from public;
grant execute on function public.medis_act(uuid, text, text, text, jsonb) to anon, authenticated;

create or replace function public.medis_login(p_mssv text, p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare gid uuid;
begin
  if trim(coalesce(p_mssv, '')) = '' then return jsonb_build_object('ok', false, 'err', 'notfound'); end if;
  select g.id into gid from public.medis_groups g
   where upper(trim(g.join_code)) = upper(trim(coalesce(p_code, '')))
     and exists (select 1 from jsonb_array_elements(g.members) m
                  where upper(trim(m ->> 'mssv')) = upper(trim(p_mssv)) and not coalesce((m ->> 'out')::boolean, false))
   order by g.created_at desc limit 1;
  if gid is null then return jsonb_build_object('ok', false, 'err', 'notfound'); end if;
  return jsonb_build_object('ok', true, 'group', gid);
end; $$;
grant execute on function public.medis_login(text, text) to anon, authenticated;
