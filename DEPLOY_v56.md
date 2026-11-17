# DEPLOY v56 — Nhãn đảo gọn hơn, khung hover vừa công trình, bảng tin chỉ giữ 3 ngày

## Thay đổi
- **Nhãn đảo trên bản đồ 3D**: chip nhỏ gọn (chấm màu + tên), đảo khoá dùng icon khoá nhỏ thay emoji 🔒.
  Khi các nhãn đè lên nhau, đảo nhỏ hơn tự thu về **chấm màu** — rê chuột vào chấm sẽ hiện tên. Đảo lớn (Main City, Admin City, Profile City) luôn giữ tên.
- **Khung hover** quanh công trình (vd. Concept Import, Medisland) giờ ôm sát công trình, không còn trùm cả nền đảo/bảng hiệu nên không bị to nữa. Nhãn tên khi hover cũng nhỏ lại.
- **City Notice Board**: chỉ hiện tin trong **3 ngày** gần nhất (tin tự động, changelog và tin đăng tay, kể cả tin ghim). Tin cũ hơn tự biến mất, không cần xoá tay.
- File: `app/components/city/createCity.js`, `app/components/city/city.css`, `lib/announcements.js`, `lib/changelog.js`.

## Supabase (tuỳ chọn)
Web đã tự ẩn tin quá 3 ngày. Nếu muốn xoá hẳn các tin đăng tay cũ trong database:
chạy `supabase/migration_v56_notice_cleanup.sql` trong SQL Editor.

## Deploy
Bấm đúp `push_v56.bat`.
