-- ============================================================================
-- migration_v36_temple.sql
-- KNOWORLD TEMPLE — lưu tiến trình game chùa (công đức, đồ cúng, quẻ gần nhất…).
--   • Cột mới site_visitors.temple (jsonb) + temple_updated_at
--   • RPC set_visitor_temple(anon_id, state) / get_visitor_temple(anon_id):
--     khách ẩn danh gọi được (SECURITY DEFINER), chỉ đụng đúng dòng của trình duyệt đó.
--
-- Chạy trong: Supabase Dashboard > SQL Editor > New query. An toàn khi chạy lại.
-- ============================================================================

alter table public.site_visitors
  add column if not exists temple            jsonb,
  add column if not exists temple_updated_at timestamptz;

create or replace function public.set_visitor_temple(p_anon_id text, p_state jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_anon_id is null or length(trim(p_anon_id)) = 0 or p_state is null then
    return false;
  end if;
  -- Chỉ nhận object nhỏ (chặn dữ liệu rác).
  if jsonb_typeof(p_state) <> 'object' or length(p_state::text) > 4000 then
    return false;
  end if;

  select sv.id into v_id
  from public.site_visitors sv
  where sv.anon_id = p_anon_id
  order by sv.created_at desc
  limit 1;

  if v_id is null then
    return false;
  end if;

  update public.site_visitors
  set temple = p_state, temple_updated_at = now()
  where id = v_id;

  return true;
end;
$$;

create or replace function public.get_visitor_temple(p_anon_id text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select sv.temple
  from public.site_visitors sv
  where sv.anon_id = p_anon_id
  order by sv.created_at desc
  limit 1;
$$;

grant execute on function public.set_visitor_temple(text, jsonb) to anon, authenticated;
grant execute on function public.get_visitor_temple(text) to anon, authenticated;
