-- ============================================================================
-- migration_v33_citizen_avatar.sql
-- NHÂN VẬT CƯ DÂN — mỗi người đăng ký lưu 1 nhân vật (giới tính, tóc, da, biểu cảm, bộ đồ).
--   • Cột mới site_visitors.avatar (jsonb) + avatar_updated_at
--   • RPC set_visitor_avatar(anon_id, avatar): khách ẩn danh gọi được (SECURITY DEFINER),
--     chỉ sửa đúng dòng của trình duyệt đó (theo anon_id), giống record_visit.
--
-- Chạy trong: Supabase Dashboard > SQL Editor > New query. An toàn khi chạy lại.
-- ============================================================================

alter table public.site_visitors
  add column if not exists avatar            jsonb,
  add column if not exists avatar_updated_at timestamptz;

create or replace function public.set_visitor_avatar(p_anon_id text, p_avatar jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_anon_id is null or length(trim(p_anon_id)) = 0 or p_avatar is null then
    return false;
  end if;
  -- Chỉ nhận object nhỏ (chặn dữ liệu rác).
  if jsonb_typeof(p_avatar) <> 'object' or length(p_avatar::text) > 600 then
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
  set avatar = p_avatar, avatar_updated_at = now()
  where id = v_id;

  return true;
end;
$$;

grant execute on function public.set_visitor_avatar(text, jsonb) to anon, authenticated;
