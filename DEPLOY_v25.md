# DEPLOY v25 — Đánh giá bắt buộc (chặn thật) + thanh menu gọn

## Có gì mới
**Đánh giá bắt buộc**
- Từ lần ghé thứ 3 mà chưa đánh giá: bảng đánh giá **chặn toàn màn hình**, không đóng / thu gọn được cho tới khi gửi (bản v24 thu gọn được nên nhiều người ghé 7–8 lần vẫn né).
- Kiểm tra trên **server** (RPC `review_status`): tổng lượt ghé gộp theo email (đổi máy / xoá trình duyệt vẫn cộng dồn), đã đánh giá chưa theo anon_id / visitor_id / email.
- Người đã ghé nhiều lần mà chưa đánh giá sẽ bị yêu cầu ngay lần vào tới.
- Giảng viên đã đăng nhập và trang /admin, /login không bị ép.

**Thanh menu**
- Visitors + Reviews gom vào menu **Admin** (dropdown) -> không còn sát ô Search.
- Chữ không xuống dòng; màn hình hẹp hơn 1280px dùng menu ☰.

## Supabase (BẮT BUỘC chạy trước)
Chạy `supabase/migration_v25_review_gate.sql` trong SQL Editor (an toàn khi chạy lại).
Chưa chạy thì web vẫn chạy, chỉ dùng số liệu cục bộ như cũ.

## Deploy
```bat
git add .
git commit -m "v25: danh gia bat buoc chan man hinh (kiem tra server) + menu Admin"
git push
```
