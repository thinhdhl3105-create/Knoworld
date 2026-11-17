-- ============================================================================
-- migration_v56_notice_cleanup.sql
-- CITY NOTICE BOARD — xoá các tin đăng tay (bảng announcements) cũ hơn 3 ngày.
-- Web (v56) cũng tự ẩn mọi tin quá 3 ngày, nên chạy file này chỉ để dọn dữ liệu cũ.
-- Chạy trong: Supabase Dashboard > SQL Editor > New query. Chạy lại bao nhiêu lần cũng được.
-- ============================================================================

delete from public.announcements
where created_at < now() - interval '3 days';

-- Xem lại những tin còn lại:
select id, title, pinned, created_at from public.announcements order by created_at desc;
