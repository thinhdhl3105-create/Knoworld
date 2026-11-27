# DEPLOY v67

## Knoworld City
- **Tàu B1/B2 chạy lại**: trước đây tàu dừng ở ga đầu tiên rồi đứng yên mãi (tưởng ga kế tiếp cách 0 m). Giờ dừng 3 giây rồi chạy tiếp vòng quanh tuyến.
- **Điện thoại gọn hơn**: nút Knoworld chỉ còn biểu tượng trên màn hẹp (không bị số liệu streak đè), thẻ giờ/thời tiết nhỏ lại (bỏ chữ "settings", chỉ còn ⚙),
  cột Skyline/B1/B2 gọn hơn, hàng khu (Main City…) mờ dần ở mép phải để biết còn kéo được, nút "Rate us" không còn đè lên hàng khu ở trang chủ trên điện thoại.

## Creative City
- **Ảnh Lạ dùng ảnh thật** (31 câu, ảnh Wikimedia Commons giấy phép tự do): ảnh phóng sát một chi tiết, lộ đáp án mới hiện toàn cảnh. 6 câu hình vẽ cũ được tắt.
  Đáp án sai cùng nhóm với đáp án đúng nên khó hơn.
- **Xáo trộn**: mỗi lần "Tạo lớp mới" bộ câu hỏi tự đổi thứ tự + vị trí 4 đáp án. Có nút 🔀 Xáo trộn ở câu 1 và trong tab Bộ câu hỏi.
- Tab Bộ câu hỏi: chỉnh độ phóng + điểm phóng ngay dưới ảnh, hoặc dán link ảnh.
- **Màn chiếu tự cập nhật**: sảnh chờ có 3 bộ đếm sống — Đã quét QR · Đã đăng ký vào lớp · Đang online; ai vừa vào lớp thì bật thông báo 🎉 góc màn hình và tên nảy ra.
- **Xưởng Vẽ Sáng Tạo**: bỏ thương hiệu, thay bằng 16 đề vẽ vui (khỉ đi siêu thị, lon nước cá tính, mèo phi hành gia…). Luật: không vẽ logo/tên nhãn hàng.

## Supabase (BẮT BUỘC, 1 lần)
SQL Editor → dán toàn bộ `supabase/migration_v67_creative_real_photos.sql` → Run.

## Deploy
Bấm đúp `push_v67.bat`.
