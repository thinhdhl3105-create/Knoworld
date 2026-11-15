# DEPLOY v55 — Biểu đồ Activity over time trên Dashboard

## Thêm mới
- Khối **Activity over time** trên Dashboard (chỉ admin thấy), nằm ngay dưới Classes by school:
  - 6 thẻ: Active hôm nay, TB active/ngày, Weekly active, Stickiness (DAU/MAU), Views trong kỳ, Nội dung mới
  - Biểu đồ cột theo ngày + đường trung bình 7 ngày, có tab Active users / Views / Hearts / New entries
  - New vs returning, giờ hay vào, ngày đông nhất trong tuần
  - Knowledge base growth: tổng tích lũy 6 thẻ số liệu theo ngày
  - Chọn 7 / 30 / 90 ngày
- `app/components/ActivityCharts.jsx`, `lib/activityStats.js`, sửa `app/dashboard/page.js`.

## Supabase
Chạy `supabase/migration_v55_activity_stats.sql` trong SQL Editor (tạo RPC `admin_activity_stats`, chỉ admin gọi được).
Không tạo bảng mới — dùng dữ liệu đã ghi sẵn (learner_activity, content_views, hearts, content...).

## Deploy
Bấm đúp `push_v55.bat`.
