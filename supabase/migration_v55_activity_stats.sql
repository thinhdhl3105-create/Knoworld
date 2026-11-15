-- ============================================================================
-- migration_v55_activity_stats.sql
-- Biểu đồ "Activity over time" trên Dashboard (chỉ admin xem).
--
-- Một RPC duy nhất: admin_activity_stats(p_days)
--   • days    — từng ngày: active users, người mới, views, hearts, nội dung mới
--   • periods — số người khác nhau trong 1 / 7 / 30 / 90 ngày (và kỳ trước đó)
--   • growth  — tổng tích lũy của 6 thẻ số liệu Dashboard theo ngày
--   • hours   — tổng lượt vào theo giờ (0..23) từ site_visitors.hour_histogram
--
-- Không tạo bảng mới — đọc dữ liệu đã ghi sẵn:
--   learner_activity (visit/concept/post), content_views, hearts,
--   content, concepts, frameworks, foundation_links, site_visitors.
--
-- Chạy trong: Supabase Dashboard > SQL Editor > New query.
-- An toàn khi chạy lại nhiều lần (idempotent).
-- ============================================================================

create index if not exists learner_activity_day_idx on public.learner_activity (day);
create index if not exists hearts_created_at_idx   on public.hearts (created_at);

create or replace function public.admin_activity_stats(p_days integer default 180)
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_days  integer := least(greatest(coalesce(p_days, 180), 14), 400);
  v_today date    := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_start date;
  v_out   json;
begin
  if coalesce(auth.jwt() ->> 'email', '') <> 'thinh.dhl3105@gmail.com' then
    raise exception 'not admin';
  end if;
  v_start := v_today - (v_days - 1);

  with
  days as (
    select g::date as day
    from generate_series(v_start, v_today, interval '1 day') g
  ),
  -- Một người "active" trong ngày = có ghé web / mở concept / đăng bài / xem nội dung.
  act as (
    select anon_id, day       from public.learner_activity where day       >= v_start - 1
    union
    select anon_id, view_date from public.content_views    where view_date >= v_start - 1
  ),
  -- Ngày đầu tiên mỗi người xuất hiện (để tách người mới / quay lại).
  firsts as (
    select anon_id, min(day) as fday
    from (
      select anon_id, day       from public.learner_activity
      union all
      select anon_id, view_date from public.content_views
    ) x
    group by anon_id
  ),
  act_d  as (select day, count(distinct anon_id) as n from act group by day),
  new_d  as (select fday as day, count(*) as n from firsts where fday >= v_start group by fday),
  view_d as (select view_date as day, count(*) as n from public.content_views where view_date >= v_start group by view_date),
  heart_d as (
    select (created_at at time zone 'Asia/Ho_Chi_Minh')::date as day, count(*) as n
    from public.hearts
    where created_at >= (v_start::timestamp at time zone 'Asia/Ho_Chi_Minh')
    group by 1
  ),
  -- Nội dung theo đúng cách Dashboard đếm 6 thẻ số liệu.
  items as (
    select case
             when c.is_foundation                               then 'foundations'
             when c.kind::text = 'research'                     then 'research'
             when c.kind::text in ('student', 'video', 'image') then 'cases'
           end as cat,
           (c.created_at at time zone 'Asia/Ho_Chi_Minh')::date as day
    from public.content c
    where c.published
    union all
    select 'concepts',    (created_at at time zone 'Asia/Ho_Chi_Minh')::date from public.concepts   where published
    union all
    select 'frameworks',  (created_at at time zone 'Asia/Ho_Chi_Minh')::date from public.frameworks where published
    union all
    select 'connections', (created_at at time zone 'Asia/Ho_Chi_Minh')::date from public.foundation_links
  ),
  item_d as (
    select cat, day, count(*) as n from items where cat is not null and day >= v_start group by cat, day
  ),
  entry_d as (
    select day, sum(n) as n from item_d where cat <> 'connections' group by day
  ),
  cats as (
    select unnest(array['foundations', 'research', 'connections', 'concepts', 'cases', 'frameworks']) as cat
  )
  select json_build_object(
    'today', v_today,
    'days', (
      select json_agg(json_build_object(
               'day',       d.day,
               'active',    coalesce(a.n, 0),
               'new_users', coalesce(nw.n, 0),
               'views',     coalesce(v.n, 0),
               'hearts',    coalesce(h.n, 0),
               'entries',   coalesce(e.n, 0)
             ) order by d.day)
      from days d
      left join act_d   a  on a.day  = d.day
      left join new_d   nw on nw.day = d.day
      left join view_d  v  on v.day  = d.day
      left join heart_d h  on h.day  = d.day
      left join entry_d e  on e.day  = d.day
    ),
    'periods', (
      select json_object_agg(p.n, json_build_object(
               'cur',  (select count(distinct anon_id) from act
                         where day >  v_today - p.n),
               'prev', (select count(distinct anon_id) from (
                          select anon_id, day from public.learner_activity
                          union
                          select anon_id, view_date from public.content_views
                        ) z
                         where day >  v_today - 2 * p.n
                           and day <= v_today - p.n)
             ))
      from unnest(array[1, 7, 30, 90]) as p(n)
    ),
    'growth', (
      select json_object_agg(c.cat, json_build_object(
               'base', (select count(*) from items i where i.cat = c.cat and i.day < v_start),
               'adds', (select json_agg(coalesce(x.n, 0) order by d.day)
                          from days d
                          left join item_d x on x.cat = c.cat and x.day = d.day)
             ))
      from cats c
    ),
    'hours', (
      select json_agg(s order by h)
      from (
        select g.h, coalesce(sum(sv.hour_histogram[g.h + 1]), 0) as s
        from generate_series(0, 23) as g(h)
        left join public.site_visitors sv on true
        group by g.h
      ) t
    )
  )
  into v_out;

  return v_out;
end;
$$;

revoke all on function public.admin_activity_stats(integer) from public, anon;
grant execute on function public.admin_activity_stats(integer) to authenticated;
