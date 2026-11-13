# DEPLOY v48 — Metro 2 tầng hầm (B1, B2) + giao diện chúc mừng các ngày lễ Việt Nam

## Có gì mới
- **Levels** (thanh giữa đáy màn hình trang chủ; trên điện thoại ở bên phải): ☁ Skyline · B1 Metro · B2 Express.
  Bấm B1/B2: thành phố bị "cắt" dần từ trên xuống, camera hạ xuống tầng hầm.
  - **B1 · Metro Concourse**: Line 1 Circle (Main City Central, Profile City, Game Island, Temple Isle, Museum Isle) + Line 2 Harbour (Main City West, Medisland, Admin City 🔒 chỉ admin thấy).
  - **B2 · Deep Express**: Line 3 Express (Central Grand Hall, East/North/West Terminal) + Train Depot.
  - Tàu chạy thật, dừng ~3 giây ở mỗi ga. Bấm vào ga → thẻ ga "🚧 Function coming soon".
  - **Gắn chức năng sau**: sửa `lib/metroStations.js` → đặt `route` (vd `'/metro/main'`) và `desc` cho ga. Có route là nút "Open page" hiện ra.
- **Ngày lễ** (tự bật theo giờ Việt Nam): Tết Nguyên đán (âm lịch, 2 ngày trước → mùng 6), 1/1 (từ 31/12), 8/3, 30/4, 1/5, 20/10, 20/11, 24/12 (đến 25/12).
  - Thiệp chúc mừng riêng (màu, minh hoạ, hiệu ứng: hoa mai/đào, pháo hoa, cánh hoa, giấy màu, tuyết), tự mở 1 lần/ngày.
  - Ruy băng trên đầu trang mở lại thiệp; nút ✕ tắt hiệu ứng hạt.
  - Thành phố 3D trang trí theo dịp ở công viên giữa Main City (cây mai, lá cờ, cuốn sách + hoa, cây thông, trái tim…), dây đèn lồng/cờ/bóng đèn dọc phố, bảng LED chạy lời chúc.
  - **Tường lời chúc**: ai cũng gửi được (tối đa 5 lời/trình duyệt/dịp), hiện ngay cho mọi người (Realtime).
  - **Admin** (trong thiệp): xem trước mọi ngày lễ, sửa tiêu đề/lời chúc, bật/tắt từng dịp, xoá lời chúc.
  - Xem trước bằng URL: `/?holiday=tet` (newyear, women83, reunification, labour, women2010, teachers, christmas); `/?holiday=off` để thoát.
  - Khi không có dịp nào, admin thấy nút "🎉 20/11 · còn N ngày — xem trước".

## Supabase (BẮT BUỘC, 1 lần)
Supabase Dashboard → SQL Editor → New query → dán toàn bộ `supabase/migration_v48_holidays.sql` → **Run**. (An toàn khi chạy lại.)
Tầng hầm Metro không cần bảng mới.

## Deploy
```bat
git push
```
