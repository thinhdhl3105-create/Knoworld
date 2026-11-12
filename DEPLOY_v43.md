# DEPLOY v43 — Classes by school: thống kê số lớp của các trường

## Có gì mới (chỉ tài khoản admin thấy)
- Khối **Classes by school** trên **/dashboard** (ngay dưới hàng thẻ số liệu) và cuối trang **/island**.
- 5 thẻ số: Schools · Classes · Running now · Sessions · Teaching hours.
- Biểu đồ thanh ngang **Number of classes per school** (cùng kiểu "Research per foundation"):
  mỗi trường một thanh = số lớp; dòng phụ: số buổi (đã dạy), số giờ, số buổi nghỉ.
- Bấm vào một trường để xem danh sách lớp: tên lớp, từ ngày – đến ngày, số buổi, buổi dạy bù, buổi nghỉ.
- Lọc theo năm: All time / 2026 / 2025… (tự lấy theo dữ liệu).

## Cách đếm
- Một chuỗi lặp hằng tuần (tạo bằng "Every week on chosen days") = **1 lớp**.
- Buổi lẻ: cùng tên + cùng trường = 1 lớp.
- Buổi dạy bù tính vào lớp của buổi gốc; buổi bị nghỉ không tính vào số buổi/giờ.
- Buổi không ghi trường nằm ở nhóm "No school set".

## Supabase
Không cần SQL mới — dùng bảng `private_events` có sẵn (v30 + v37), RLS chỉ-admin giữ nguyên.

## Deploy
```bat
git push
```
