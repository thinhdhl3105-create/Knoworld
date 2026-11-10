# DEPLOY v35 — Đầu trang con không bị cắt

## Có gì mới
- Hàng tòa nhà ở đầu mọi trang con có thêm khoảng trời phía trên: chóp tháp đồng hồ (Discussion), ăng-ten News Tower… không còn bị cắt.
- Màn hình hẹp (điện thoại, tablet): hàng nhà neo về bên phải nên tòa nhà chính của trang luôn hiện ra, và có thêm khoảng trống dưới thẻ tiêu đề để tòa nhà không bị thẻ che.
- Đã kiểm tra 18 trang con ở 8 độ rộng (360 → 1920px).

Không cần chạy SQL Supabase.

## Deploy
```bat
git add .
git commit -m "v35: dau trang con khong bi cat"
git push
```
