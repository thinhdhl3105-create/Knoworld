-- ============================================================================
-- migration_v25_review_gate.sql
-- Đánh giá bắt buộc từ lần ghé thứ 3 — kiểm tra trên SERVER thay vì chỉ localStorage.
--   • review_status(anon_id) -> tổng lượt ghé (gộp mọi dòng cùng email)
--                               + đã từng gửi đánh giá chưa (theo anon_id / visitor_id / email)
-- Người đã ghé 7–8 lần mà chưa đánh giá sẽ bị yêu cầu đánh giá ngay lần vào tới.
-- Chạy trong: Supabase Dashboard > SQL Editor > New query. An toàn chạy lại nhiều lần.
-- ============================================================================

create or replace function public.review_status(p_anon_id text)
returns table(total_visits integer, has_reviewed boolean)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_id    uuid;
  v_email text;
begin
  if p_anon_id is null or length(trim(p_anon_id)) = 0 then
    return;
  end if;

  select sv.id, lower(trim(sv.email)) into v_id, v_email
  from public.site_visitors sv
  where sv.anon_id = p_anon_id
  order by sv.created_at desc
  limit 1;

  if v_id is null then
    -- Chưa qua cổng đăng ký: chỉ báo đã đánh giá hay chưa theo anon_id.
    total_visits := 0;
    has_reviewed := exists (select 1 from public.site_reviews r where r.anon_id = p_anon_id);
    return next;
    return;
  end if;

  -- Gộp lượt ghé của mọi dòng cùng email (đổi máy / xoá dữ liệu trình duyệt vẫn cộng dồn).
  select coalesce(sum(sv.visit_count), 0)::int into total_visits
  from public.site_visitors sv
  where sv.id = v_id
     or (v_email is not null and v_email <> '' and lower(trim(sv.email)) = v_email);

  has_reviewed := exists (
    select 1
    from public.site_reviews r
    where r.anon_id = p_anon_id
       or r.visitor_id = v_id
       or (v_email is not null and v_email <> '' and (
             lower(trim(r.visitor_email)) = v_email
             or r.visitor_id in (select sv2.id from public.site_visitors sv2
                                 where lower(trim(sv2.email)) = v_email)
          ))
  );

  return next;
end;
$$;

grant execute on function public.review_status(text) to anon, authenticated;
