# DEPLOY v40 — Knoworld Museum (đảo bảo tàng)

## Có gì mới
- **Museum Isle** trên bản đồ thành phố: nằm giữa Main City và Temple Isle, nối Main City bằng **Cầu Ký Ức** và nối sang chùa bằng một cây cầu thứ hai.
- Trang `/museum`: game pixel đi tham quan (giống chùa).
  - Ngoài đảo: cầu về Main City (dưới), cầu sang Temple Isle (phải), đài phun nước, bảo vệ, khách đi ra đi vào.
  - Bên trong: Sảnh Chính (hướng dẫn viên, sơ đồ, Sổ lưu bút, bảng xếp hạng) · Phòng Lớp Học · Phòng Sự Kiện · Sảnh Thành Tích · Phòng Ống Kính · **Phòng Riêng** (cửa hồng, nhập đúng mật khẩu mới mở).
  - **Mọi người thấy nhau** (Supabase Realtime, kênh `kw-museum`), nói câu có sẵn (phím T).
  - **Điểm khám phá**: xem hiện vật lần đầu +10, vào phòng mới +5, xem hết một phòng +30, ký sổ lưu bút +15. Có bảng xếp hạng (chỉ hiện tên gọi).
  - **Tìm 10 em vịt**: mỗi ngày 10 em vịt trốn chỗ mới (3 ngoài đảo, 7 trong nhà), +20 mỗi em, đủ 10 em +100.
- Trang `/museum/admin` (chỉ admin): chọn phòng → chọn / kéo thả nhiều ảnh → sửa tiêu đề, ngày, nơi chụp, lời kể → **Treo ảnh**. Ảnh mới tự treo vào khung trống kế tiếp; hết khung thì vào **Album** của phòng. Sửa, đổi thứ tự (↑ ↓), gỡ ảnh, đổi mật khẩu Phòng Riêng, xoá lời nhắn sổ lưu bút.
  - Trong game, khi đăng nhập admin sẽ thấy nút **＋ Treo ảnh** trên thanh trên cùng và nút tải ảnh trong mỗi Album.
- Chùa: ra cổng dưới giờ có thêm lựa chọn **Qua cầu sang Bảo tàng**.
- Số khung mỗi phòng: Lớp Học 10 · Sự Kiện 10 · Thành Tích 9 · Ống Kính 7 · Phòng Riêng 7 (đổi trong `lib/museumGame.js`, mục `SLOTS`).
- Ngày bắt đầu yêu nhau (trái tim đếm ngày trong Phòng Riêng): `LOVE_SINCE` đầu file `lib/museumGame.js`.

## 1) Supabase (chạy trước)
Supabase Dashboard → SQL Editor → New query → dán toàn bộ `supabase/migration_v40_museum.sql` → Run.
Tạo: bảng `museum_photos`, `museum_guestbook`, `museum_secrets`, cột `site_visitors.museum`, các RPC, bucket Storage `museum`.
**Mật khẩu Phòng Riêng mặc định: `1402`** → vào `/museum/admin`, tab Phòng Riêng, đổi ngay.

## 2) Deploy
```bat
git add .
git commit -m "v40: Knoworld Museum - dao bao tang, cau sang chua, treo anh, phong rieng, diem kham pha, tim 10 em vit"
git push
```
Vercel tự build sau khi push.

## Thử
- Mở `/museum` ở 2 trình duyệt (1 tab thường + 1 tab ẩn danh) → thấy nhau đi lại.
- Đăng nhập admin → `/museum/admin` → treo vài ảnh vào Phòng Lớp Học → mở lại `/museum` thấy ảnh trên tường.
