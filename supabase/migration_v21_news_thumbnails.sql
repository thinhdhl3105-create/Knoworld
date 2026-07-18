-- v21: Thumbnail cho News — thêm cột image_url vào news_items.
-- An toàn khi chạy lại nhiều lần.
alter table public.news_items add column if not exists image_url text;
