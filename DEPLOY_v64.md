# DEPLOY v64 — Creative City (thành phố riêng cho buổi dạy thử) + widget Knoworld trên điện thoại

## Creative City
Thành phố đứng riêng, không có menu/Lumi/cổng visa của Knoworld City. Học sinh **không cần tài khoản**.

- **Học sinh:** `/creative?r=MÃ-PHÒNG` (quét QR trên màn chiếu), nhập biệt danh và chọn màu là vào.
  Điện thoại tự chuyển theo trạm giáo viên đang mở.
  - **Phòng Ảnh Lạ:** chơi kiểu Kahoot. Ảnh cắt sát, 4 ô đáp án, đếm ngược 20 giây, máy chủ tính điểm (đúng + nhanh).
  - **Xưởng Vẽ Thương Hiệu:** mỗi em bốc một sản phẩm thương hiệu Việt (chia đều trong lớp), vẽ không ghi tên. Vẽ trên giấy rồi chụp, hoặc vẽ trên điện thoại.
  - **Phòng Tranh:** tải tranh lên (tối đa 3 tranh/em), giáo viên duyệt xong mới hiện. Tường kiểu Pinterest, lọc theo thương hiệu, thả tim.
  - **Quảng trường:** word cloud "Sáng tạo với em là…" (tối đa 3 từ/em).
- **Giáo viên (màn chiếu):** `/creative/host` (đăng nhập tài khoản admin).
  - Chọn hoặc tạo phòng, hiện QR, chuyển trạm cho cả lớp.
  - Bắt đầu câu hỏi, lộ đáp án (tự lộ khi hết giờ hoặc cả lớp đã trả lời), bảng điểm.
  - Bấm giờ vẽ, duyệt/ẩn tranh, xem Phòng Tranh và word cloud cỡ lớn.
  - Tab **Bộ câu hỏi**: tải ảnh chụp thật, sửa câu hỏi và 4 đáp án.
  - Tab **Thương hiệu**: thêm/sửa sản phẩm.
  - Tab **Phòng**: số giây mỗi câu, đóng phòng, làm mới phòng.
  - Mentimeter: dán mã (học sinh thấy) và mã nhúng kết quả (chỉ hiện trên màn chiếu).
- Thành viên Knoworld thấy thêm nút **Creative City** trên thanh menu.

## Widget "Knoworld trên điện thoại" (toàn bộ Knoworld)
- Nút biểu tượng điện thoại trên thanh menu (và trong menu ☰ trên điện thoại):
  - Android: nút **Cài Knoworld**.
  - iPhone: hướng dẫn Safari → Chia sẻ → Thêm vào MH chính.
  - Máy tính: mã QR để mở trên điện thoại.
- Trên điện thoại, từ lần ghé thứ 2 có lời nhắc nhỏ (bấm ✕ thì ẩn 14 ngày).
- Sau khi cài, **nhấn giữ biểu tượng** để mở nhanh: Dashboard, Knowledge Hub, MetroGram, Medisland, Creative City (Android).
- Có trang "mất kết nối" khi không có mạng (`public/sw.js`, `public/offline.html`).

## Supabase (bắt buộc, làm TRƯỚC khi push)
Supabase Dashboard → SQL Editor → New query → dán toàn bộ `supabase/migration_v64_creative_city.sql` → **Run**.
Lệnh này tạo các bảng `cc_*`, bucket ảnh `creative`, phòng mẫu **CC-DEMO**, 7 thương hiệu và 6 câu hỏi mẫu. Chạy lại nhiều lần vẫn an toàn.

## Deploy
Bấm đúp `push_v64.bat` (có thêm thư viện `qrcode`, Vercel tự cài khi build).

## Thử nhanh sau khi deploy
1. Máy tính: mở `/creative/host`, chọn phòng CC-DEMO (hoặc tạo phòng mới ở tab Phòng).
2. Điện thoại: quét QR trên màn chiếu, nhập biệt danh.
3. Màn chiếu: bấm trạm **Ảnh Lạ**, rồi **Bắt đầu câu 1**. Điện thoại hiện ảnh và 4 đáp án.
4. Trước buổi dạy thật: tab **Phòng**, chọn **Làm mới phòng** để xoá dữ liệu thử.
