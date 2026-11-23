-- ============================================================================
-- migration_v58_onboarding.sql
-- HƯỚNG DẪN CƯ DÂN MỚI (Lumi) — lưu tiến độ hướng dẫn của từng người đăng ký.
--   • Cột mới site_visitors.onboarding (jsonb) + onboarding_updated_at
--     { status, path, stamps[], lumi_off, skipped, first_day, done_at }
--   • RPC set_visitor_onboarding(anon_id, data): khách ẩn danh gọi được (SECURITY DEFINER),
--     chỉ sửa đúng dòng của trình duyệt đó (theo anon_id), giống set_visitor_avatar.
--
-- Chạy trong: Supabase Dashboard > SQL Editor > New query. An toàn khi chạy lại.
-- ============================================================================

alter table public.site_visitors
  add column if not exists onboarding            jsonb,
  add column if not exists onboarding_updated_at timestamptz;

create or replace function public.set_visitor_onboarding(p_anon_id text, p_data jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_anon_id is null or length(trim(p_anon_id)) = 0 or p_data is null then
    return false;
  end if;
  -- Chỉ nhận object nhỏ (chặn dữ liệu rác).
  if jsonb_typeof(p_data) <> 'object' or length(p_data::text) > 800 then
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
  set onboarding = p_data, onboarding_updated_at = now()
  where id = v_id;

  return true;
end;
$$;

grant execute on function public.set_visitor_onboarding(text, jsonb) to anon, authenticated;
