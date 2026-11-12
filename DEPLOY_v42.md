# DEPLOY v42 — Today's Schedule: bảng lịch hằng ngày ở góc trái trang chủ

## Có gì mới (trang chủ, chỉ tài khoản admin thấy)
- Bảng **Today's Schedule** ở góc trái, ngay dưới hàng nút Main City / Game Island…, cùng kiểu với City Notice Board bên phải.
- Lấy lịch từ **Harbour board** trên /island (lịch dạy, lịch họp, ngày quan trọng) — thêm/sửa ở /island là bảng tự cập nhật (làm mới mỗi 5 phút và mỗi khi quay lại tab).
- Mỗi buổi: giờ bắt đầu–kết thúc, loại (Teaching / Meeting / Important), trường · phòng, ghi chú.
  Trạng thái theo giờ Việt Nam: **Now · còn X phút** (chấm xanh), **in 1h 08**, **Done** (mờ), **Cancelled** (gạch ngang), nhãn **MAKE-UP** cho buổi dạy bù.
- Huy hiệu "**3 left**" = số việc còn lại hôm nay. Dòng tóm tắt: số buổi dạy / họp / việc quan trọng.
- Nút ‹ › xem hôm qua / ngày mai / ngày khác, "Back to today" để quay lại. Dòng cuối báo trước ngày mai (số việc, giờ bắt đầu sớm nhất).
- Khi bấm vào một toà nhà (thẻ thông tin hiện ở góc dưới trái) bảng tạm ẩn để không chồng lên.
- Điện thoại: thành nút gọn dưới nút Notices; bấm để mở.
- Khách và sinh viên **không** thấy bảng này (dữ liệu vẫn do RLS chỉ-admin của bảng `private_events` bảo vệ).

## Supabase
Không cần SQL mới — dùng bảng `private_events` có sẵn (v30 + v37).
Nếu chưa chạy thì chạy theo thứ tự: `migration_v30_island.sql`, `migration_v37_island_teaching.sql`.

## Deploy
```bat
git push
```
(Đã commit sẵn trên máy.)
