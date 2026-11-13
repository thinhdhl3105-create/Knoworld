# DEPLOY v49 — Thời tiết thật, Skyline nhìn xuyên 2 tầng hầm, người đi lại, ngày lễ nhẹ nhàng, sự kiện bất ngờ ở Medisland

## Knoworld City
- **Thời tiết thật TP.HCM** (Open-Meteo, không cần key, làm mới mỗi 10 phút): mưa/mưa phùn/giông (có sấm chớp), mây, sương mù, nhiệt độ hiện ở đồng hồ. Nút Weather: **Live** (mặc định) · Sunny · Rain. Mất mạng → tự quay về kiểu mô phỏng cũ.
- **Levels**: Skyline thấy cả thành phố + B1 + B2 xếp tầng bên dưới. Chọn B1 → Skyline biến mất, còn B1 + B2. Chọn B2 → chỉ còn B2. Bấm vào ga ở tầng dưới ngay từ Skyline cũng được.
  Toạ độ tầng mới: B1 y = -78, B2 y = -150 (`lib/metroStations.js`).
- **Tàu + người**: tàu chạy trên cả 3 tuyến, hành khách đi qua lại trên sân ga, dừng chờ tàu; thợ bảo trì đi lại ở Depot. Giếng sáng thang cuốn nối thẳng các tầng.
- **Ngày lễ**: bỏ thiệp tự bật và tường lời chúc. Chỉ còn: thành phố trang trí theo dịp + **pháo hoa và dòng chúc mừng lúc vào trang** (1 lần mỗi phiên, tự tắt sau 7 giây, không chặn thao tác).
- **Bỏ nút "🎉 20/11 · còn N ngày – xem trước"** trên thành phố. Ghi chú ngày lễ giờ nằm trong bảng **Today's Schedule** (chỉ admin): Preview / 🎆 bắn lại / Edit lời chúc / Exit.

## Medisland
- **Sự kiện bất ngờ**: sau 2 lần chạy đầu, đúng **1** sự kiện nổ ra ở một thời điểm ngẫu nhiên trong lần chạy 3 hoặc 4, kéo dài 1,5–3 ngày đảo (flash sale đối thủ, tin xấu kinh tế, cúm mùa, sự cố mạng xã hội, đua thầu quảng cáo, khủng hoảng ngành, nắng nóng). Tác động nhẹ, tỉ lệ với số ngày kéo dài.
- **Công bằng**: rút thăm theo lớp — mọi agency trong cùng lớp gặp cùng sự kiện, cùng lần chạy, cùng thời điểm (theo ngày đảo), cùng mức độ. Sinh viên không biết trước; khi xảy ra có "⚡ Tin nóng" (thông báo, Bảng tin, bảng LED, báo cáo tuần, lời người dân khi phỏng vấn).
- **Giảng viên**: Quản trị → Lớp & agency → thẻ "Thiết lập brief" có ô **Sự kiện bất ngờ: Bật/Tắt** và dòng xem trước sự kiện đã rút cho lớp (chỉ GV thấy). Chỉ áp cho lần chạy chốt sau bản cập nhật này — kết quả cũ không đổi.

## Supabase
Không cần chạy SQL mới (cài đặt sự kiện lưu trong `medis_classes.settings` đã có từ v47).

## Deploy
```bat
git push
```
