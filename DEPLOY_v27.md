# DEPLOY v27 — Menu kiểu thành phố + City Notice Board

## Có gì mới
**Thanh menu (mọi trang)**
- Các nút bo tròn nền tối mờ có chấm màu — cùng kiểu với thanh Main City / Admin City / Profile City.
- Trang chủ: menu nổi trong suốt trên thành phố. Các trang khác: có nền mờ phía sau.
- Bảng số liệu thành phố trên thanh: 🔥 streak của bạn · 👥 số người đã tham gia (bấm để mở My Journey).
- Profile thành menu thả xuống (My Profile, My Journey, Sign Out). Admin có thêm Access, Concept Import.

**Trang chủ**
- Chỉ còn thành phố, toàn màn hình. Bỏ phần chữ, số liệu, Curated Pathways, Active Learning Flux và footer bên dưới.

**City Notice Board**
- Bảng thông báo nằm dưới bảng đồng hồ (bên phải). Có nhãn Feature / Update / Event / Notice, NEW cho tin chưa xem, số tin mới.
- Admin đăng tin ngay trên bảng: "+ Post an update" (tiêu đề, mô tả, link, nhãn, ghim). Có Pin / Unpin / Remove.
- Điện thoại: bảng thu thành nút nhỏ góc trái, bấm để mở.

## Supabase (chạy trước)
Chạy `supabase/migration_v27_announcements.sql` trong SQL Editor (an toàn khi chạy lại).
Chưa chạy thì bảng vẫn hiện 2 thông báo mặc định, chỉ chưa đăng tin mới được.

## Deploy
```bat
git add .
git commit -m "v27: menu kieu thanh pho, City Notice Board, trang chu chi con thanh pho"
git push
```
