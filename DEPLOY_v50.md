# DEPLOY v50 — Metro Ad Wall + các tầng hầm sát nhau lại

## Có gì mới
- **B1, B2 sát lại** (B1 y = -40, B2 y = -70; v49 là -78 / -150). Skyline vẫn thấy mép trước của B1, B2 bên dưới.
- **Metro Ad Wall**: mỗi ga B1/B2 có 2 hộp đèn trên tường sau, chiếu xoay vòng poster/chiến dịch hay nhất của sinh viên (mặc định 9 giây đổi 1 lần, mỗi hộp lệch nhau nên các ga không giống hệt nhau). Chưa có poster thì hộp đèn hiện "YOUR CAMPAIGN HERE".
- Trang **/metro/ads**: ai cũng xem thư viện poster (bấm để phóng to). Admin (đăng nhập email admin) thấy khung quản lý: tải nhiều ảnh cùng lúc, ghi tên chiến dịch / nhóm / môn, bật-ẩn, xếp thứ tự, xoá, đổi số giây xoay.
- Bấm vào ga trên bản đồ → nút "Open page" dẫn tới /metro/ads (khi bạn gắn `route` riêng cho ga trong `lib/metroStations.js`, route đó sẽ thay thế).

## Supabase
Không cần SQL mới: danh sách poster lưu ở `site_content` (key `metro_ads`), ảnh lưu trong bucket `museum` có sẵn (thư mục `metro-ads/`).

## Deploy
```bat
git push
```
