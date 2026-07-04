-- ============================================================================
-- migration_v18_roles_students.sql
-- v18 — Phân vai người vào web: Student / Stranger (Guest) / Lecturer
--
--   • site_visitors: thêm cột
--       - role        : 'student' | 'stranger'  (mặc định 'student' -> visitor
--                       cũ giữ nguyên quyền xem full như student)
--       - student_id  : MSSV (chỉ student mới có)
--       - full_access : admin bật cho stranger được xem full như student
--
--   • approved_students: danh sách MSSV được phép đăng ký student
--       (admin dán / upload trong trang Admin > Access)
--
--   • RPC cho khách ẩn danh (SECURITY DEFINER):
--       - check_student_id(mssv)  -> MSSV có trong danh sách không (+ họ tên)
--       - visitor_access(anon_id) -> role / full_access / blocked hiện tại
--                                    (để client biết admin vừa allow access)
--
--   • 5 case cho stranger được lưu ở bảng site_content (đã có từ v12,
--     public read / admin write) dưới key 'stranger_featured_cases'
--     -> không cần bảng mới.
--
-- Chạy trong: Supabase Dashboard > SQL Editor > New query.
-- An toàn khi chạy lại nhiều lần (idempotent).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Cột mới trên site_visitors
-- ---------------------------------------------------------------------------
alter table public.site_visitors
  add column if not exists role        text    not null default 'student',
  add column if not exists student_id  text,
  add column if not exists full_access boolean not null default false;

-- Ràng buộc giá trị role (thêm kiểu "nếu chưa có").
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'site_visitors_role_check'
      and conrelid = 'public.site_visitors'::regclass
  ) then
    alter table public.site_visitors
      add constraint site_visitors_role_check
      check (role in ('student', 'stranger'));
  end if;
end $$;

create index if not exists site_visitors_student_id_idx on public.site_visitors (student_id);
create index if not exists site_visitors_role_idx       on public.site_visitors (role);

-- ---------------------------------------------------------------------------
-- 2) Danh sách MSSV được duyệt (admin quản lý)
-- ---------------------------------------------------------------------------
create table if not exists public.approved_students (
  student_id text primary key,          -- MSSV (đã trim + upper)
  full_name  text,                      -- Họ tên (tuỳ chọn, từ file upload)
  note       text,
  created_at timestamptz not null default now()
);

alter table public.approved_students enable row level security;

-- Chỉ admin được đọc/ghi trực tiếp. Khách kiểm tra MSSV qua RPC bên dưới.
drop policy if exists approved_students_admin_all on public.approved_students;
create policy approved_students_admin_all
  on public.approved_students
  for all
  to authenticated
  using      ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' );

-- ---------------------------------------------------------------------------
-- 3) RPC: khách kiểm tra MSSV có trong danh sách không
-- ---------------------------------------------------------------------------
create or replace function public.check_student_id(p_student_id text)
returns table(ok boolean, full_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  select s.full_name into v_name
  from public.approved_students s
  where s.student_id = upper(trim(p_student_id));

  if found then
    return query select true, v_name;
  else
    return query select false, null::text;
  end if;
end;
$$;

grant execute on function public.check_student_id(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) RPC: client hỏi quyền hiện tại của mình (role / full_access / blocked)
--    -> để stranger được admin "Allow access" thấy hiệu lực ngay.
-- ---------------------------------------------------------------------------
create or replace function public.visitor_access(p_anon_id text)
returns table(role text, full_access boolean, blocked boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select v.role, v.full_access, v.blocked
  from public.site_visitors v
  where v.anon_id = p_anon_id
  order by v.created_at desc
  limit 1;
end;
$$;

grant execute on function public.visitor_access(text) to anon, authenticated;
