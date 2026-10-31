# DEPLOY v22 — Most viewed trên Dashboard · Ghi chú bắt buộc khi đánh giá

## Có gì mới
1. **Dashboard > Most viewed**: Top videos, Top case studies (student + image), Most hearted.
   Lọc 7 ngày / 30 ngày / All time. Mỗi người xem lại cùng nội dung trong 1 ngày = 1 lượt.
   Bắt đầu đếm từ lúc deploy v22 (không có dữ liệu cũ).
2. **Rate us**: ô feedback bắt buộc, tối thiểu 10 ký tự (UI + ràng buộc trong DB).

## File thay đổi
- `supabase/migration_v22_views_reviews.sql` (mới): bảng `content_views`, RPC `record_content_view`,
  `content_view_stats`, constraint `site_reviews_comment_required` (NOT VALID — không ảnh hưởng đánh giá cũ).
- `lib/views.js` (mới), `lib/reviews.js`, `app/dashboard/page.js`, `app/components/ReviewWidget.jsx`,
  `app/videos/page.js`, `app/images/page.js`, `app/students/[id]/page.js`.

## Thứ tự deploy
1. Supabase > SQL Editor > New query → dán `supabase/migration_v22_views_reviews.sql` → Run.
2. Trên máy:
```bash
git add .
git commit -m "v22: Most viewed tren Dashboard + ghi chu bat buoc khi danh gia"
git push
```
