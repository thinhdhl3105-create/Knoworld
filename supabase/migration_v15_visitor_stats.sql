-- ============================================================================
-- migration_v15_visitor_stats.sql
-- Thêm cho mỗi người ra vào (site_visitors):
--   • visit_count           — số lần truy cập web
--   • last_visit_at         — lần truy cập gần nhất
--   • total_active_seconds  — tổng thời lượng ở web (để tính trung bình mỗi lần)
--   • hour_histogram        — đếm số lần vào theo từng giờ (0..23) -> tìm khung giờ hay vào
--   • blocked               — admin có thể tắt quyền truy cập của email không hợp lệ
--
-- Ba RPC (SECURITY DEFINER) cho khách ẩn danh gọi được:
--   • record_visit(anon_id, local_hour)   — ghi 1 lần truy cập, trả về visit_count + blocked
--   • record_session_duration(anon_id, s) — cộng dồn thời lượng ở web
--   • public_visitor_count()              — số người đã đăng ký (hiện công khai ở trang chủ)
--
-- Chạy trong: Supabase Dashboard > SQL Editor > New query.
-- An toàn khi chạy lại nhiều lần (idempotent).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Thêm cột thống kê vào bảng người ra vào
-- ---------------------------------------------------------------------------
alter table public.site_visitors
  add column if not exists visit_count          integer      not null default 1,
  add column if not exists last_visit_at        timestamptz  not null default now(),
  add column if not exists total_active_seconds bigint       not null default 0,
  add column if not exists hour_histogram       integer[]    not null default array_fill(0, ARRAY[24]),
  add column if not exists blocked              boolean      not null default false;

create index if not exists site_visitors_last_visit_idx on public.site_visitors (last_visit_at desc);

-- ---------------------------------------------------------------------------
-- 2) Cho phép admin CẬP NHẬT (để bật/tắt quyền truy cập -> cột blocked)
-- ---------------------------------------------------------------------------
drop policy if exists site_visitors_admin_update on public.site_visitors;
create policy site_visitors_admin_update
  on public.site_visitors
  for update
  to authenticated
  using      ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'thinh.dhl3105@gmail.com' );

-- ---------------------------------------------------------------------------
-- 3) RPC: ghi 1 lần truy cập (khách ẩn danh gọi được nhờ SECURITY DEFINER).
--    Trả về visit_count mới + trạng thái blocked để client biết có bị chặn không.
-- ---------------------------------------------------------------------------
create or replace function public.record_visit(p_anon_id text, p_local_hour integer default null)
returns table(visit_count integer, blocked boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id   uuid;
  v_hour integer;
begin
  if p_anon_id is null or length(trim(p_anon_id)) = 0 then
    return;
  end if;

  v_hour := coalesce(p_local_hour, extract(hour from now())::int);
  if v_hour < 0 or v_hour > 23 then
    v_hour := 0;
  end if;

  -- Lấy đúng dòng người dùng gần nhất theo anon_id (id trình duyệt).
  select sv.id into v_id
  from public.site_visitors sv
  where sv.anon_id = p_anon_id
  order by sv.created_at desc
  limit 1;

  if v_id is null then
    return;  -- không có ai khớp anon_id này -> bỏ qua
  end if;

  update public.site_visitors sv
  set visit_count   = sv.visit_count + 1,
      last_visit_at = now(),
      hour_histogram[v_hour + 1] = coalesce(sv.hour_histogram[v_hour + 1], 0) + 1
  where sv.id = v_id
  returning sv.visit_count, sv.blocked
  into visit_count, blocked;

  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) RPC: cộng dồn thời lượng ở web (gọi định kỳ trong lúc xem).
-- ---------------------------------------------------------------------------
create or replace function public.record_session_duration(p_anon_id text, p_seconds integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id  uuid;
  v_sec integer;
begin
  if p_anon_id is null or p_seconds is null or p_seconds <= 0 then
    return;
  end if;

  v_sec := least(p_seconds, 3600);  -- chặn giá trị bất thường (tối đa 1 giờ mỗi lần cộng)

  select sv.id into v_id
  from public.site_visitors sv
  where sv.anon_id = p_anon_id
  order by sv.created_at desc
  limit 1;

  if v_id is null then
    return;
  end if;

  update public.site_visitors sv
  set total_active_seconds = sv.total_active_seconds + v_sec
  where sv.id = v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) RPC: số người đã đăng ký (công khai — hiện ở trang chủ).
--    Chỉ trả về CON SỐ, không lộ danh sách người dùng.
-- ---------------------------------------------------------------------------
create or replace function public.public_visitor_count()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int from public.site_visitors;
$$;

-- ---------------------------------------------------------------------------
-- 6) Cấp quyền gọi RPC cho khách ẩn danh + người đã đăng nhập
-- ---------------------------------------------------------------------------
grant execute on function public.record_visit(text, integer)            to anon, authenticated;
grant execute on function public.record_session_duration(text, integer) to anon, authenticated;
grant execute on function public.public_visitor_count()                 to anon, authenticated;
