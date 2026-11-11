# DEPLOY v41 — Harbour board: sửa thông tin lớp & kéo-thả đổi buổi

## Có gì mới (trang /island)
- **Edit**: bấm vào một buổi → Edit → sửa tên, loại (Teaching/Meeting/Important), ngày, giờ, trường, phòng, ghi chú.
  - Buổi thuộc chuỗi lặp có ô **Apply to**: "Only this session" hoặc "This & all later sessions".
  - Chọn "This & all later" và đổi ngày (vd T2 → T3): mọi buổi sau cũng dời cùng số ngày, nên nhập sai thứ cũng sửa được một lần.
- **Kéo-thả**: kéo một buổi sang ngày khác hoặc giờ khác trong tuần đang xem (bắt theo nấc 15 phút, giữ nguyên thời lượng). Trên điện thoại: giữ ngón tay khoảng 0,35 giây rồi kéo. Nhấn Esc để huỷ khi đang kéo.
- Dòng gợi ý dưới Harbour board.

## Supabase
Không cần SQL mới (quyền sửa đã có từ v30). Nếu chưa chạy `migration_v37_island_teaching.sql` thì chạy file đó trước.

## Deploy
```bat
git push
```
(Đã commit sẵn trên máy.)
