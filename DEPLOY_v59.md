# DEPLOY v59 — Lumi lấp ló + Lumi đi dạo trong city, bảng Bộ đồ gọn lại

## Thay đổi
- **Bảng tạo nhân vật gọn hơn**: sửa lỗi bảng "Bộ đồ" bị chia cột dọc (do `city.css` có class `.kwa-row` trùng tên với bảng lịch admin → đã giới hạn trong `.kwb`).
  Nhãn nằm bên trái, lựa chọn bên phải; trang phục là dải 2 hàng cuộn ngang; nhân vật lớn nhỏ lại một chút.
- **Lumi lấp ló ở 4 góc màn hình** (`LumiPeek.jsx`): thụt ra – thụt vô – rồi ló hẳn và nói một câu.
  - Trái trên: treo ngược dưới thanh menu, đung đưa · Phải trên: nghiêng người ngó từ mép phải
  - Trái dưới: ngó từ mép trái · Phải dưới: nhô đầu lên từ đáy màn hình
  - Khoảnh khắc: chào ngày mới (theo giờ VN, 1 lần/ngày), vào một khu (câu hợp khu: Hub, Temple, MetroGram, Medisland…),
    ngồi im ~1 phút, cuộn tới cuối trang dài, vừa nhận huy hiệu/streak, ghé ngang ngẫu nhiên 2–4 phút.
  - Cách nhau ≥ 50 giây, tối đa 8 lần/phiên, không chen khi đang có hướng dẫn Lumi / hộp thoại / cổng đăng ký.
  - Bấm vào Lumi → nhảy + nói; có nút **Tắt Lumi lấp ló** (tắt cả Lumi trong city). Bật lại bằng nút "Xem lại hướng dẫn cùng Lumi" ở My Journey.
- **Lumi đi dạo trong Main City** (`city/cityLumi.js`): đi trên vỉa hè quanh các khối nhà, qua đường ở vạch kẻ,
  tới góc phố hay thập thò (lùi vào, ngó ra), thỉnh thoảng đứng nhìn quanh. Nhà cao che Lumi thật nên lúc thấy lúc không.
  Rê chuột → "Lumi · Bấm để chào"; bấm → nhảy lên + nói. Ban đêm ngôi sao trên đầu toả sáng. Chỉ hiện ở tầng Skyline.
- Hình Lumi tách ra `onboarding/lumiArt.js` dùng chung.

## Supabase
Không cần chạy SQL. Cài đặt bật/tắt Lumi lấp ló lưu trên trình duyệt.

## Deploy
Bấm đúp `push_v59.bat`.
