-- ============================================================================
-- migration_v28_city_pages.sql
-- Không có bảng mới. Chỉ đăng 1 thông báo lên City Notice Board về giao diện mới.
-- Cần chạy migration_v27_announcements.sql trước. An toàn khi chạy lại.
-- ============================================================================
insert into public.announcements (title, body, tag, link, pinned, created_by)
select 'Every page is now a building',
       'News Tower, the Library metro map, the Cinema, the Gallery, the Town Square and your own house in Profile City — each page now has its own sky that follows Vietnam time. Tap "Back to city" to fly straight back to that building.',
       'new', '/knowledge-hub', true, 'thinh.dhl3105@gmail.com'
where not exists (select 1 from public.announcements where title = 'Every page is now a building');

-- Bỏ ghim thông báo cũ để tin mới nằm trên cùng.
update public.announcements set pinned = false
where title = 'The city got a new look';
