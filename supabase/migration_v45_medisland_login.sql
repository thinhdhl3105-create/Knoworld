-- ============================================================================
-- migration_v45_medisland_login.sql  (chạy SAU migration_v44_medisland.sql)
-- • Sinh viên chỉ đăng nhập bằng MSSV + mã vào đảo → máy chủ tự tìm đúng nhóm.
--   Không còn danh sách lớp / nhóm / thành viên công khai cho khách.
-- Chạy trong: Supabase Dashboard > SQL Editor > New query > dán toàn bộ > Run. An toàn khi chạy lại.
-- ============================================================================

create or replace function public.medis_login(p_mssv text, p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare gid uuid;
begin
  select g.id into gid from public.medis_groups g
   where upper(trim(g.join_code)) = upper(trim(coalesce(p_code, '')))
     and exists (select 1 from jsonb_array_elements(g.members) m where upper(trim(m ->> 'mssv')) = upper(trim(coalesce(p_mssv, ''))))
   order by g.created_at desc limit 1;
  if gid is null then return jsonb_build_object('ok', false, 'err', 'notfound'); end if;
  return jsonb_build_object('ok', true, 'group', gid);
end;
$$;
grant execute on function public.medis_login(text, text) to anon, authenticated;

-- danh sách lớp/nhóm không còn mở cho khách
revoke execute on function public.medis_directory() from anon, authenticated, public;
