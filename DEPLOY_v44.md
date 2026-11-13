# DEPLOY v44 — Medisland: đảo mô phỏng chiến dịch truyền thông (Media Strategy & Tactics)

## Có gì mới
- Đảo **Medisland** mới trên bản đồ thành phố (phía tây nam Main City) + mục **Medisland** trên thanh menu → trang `/medisland`.
- Game pixel chạy trong khung (file `public/medisland/game.html`), dữ liệu qua Supabase (`lib/medisland.js`).
- Mỗi **agency (nhóm)** một hòn đảo riêng; chỉ thành viên trong nhóm gặp nhau trên đảo (Realtime, kênh riêng mỗi nhóm).
- Sinh viên đăng nhập: chọn **Lớp → Agency**, nhập **MSSV + Mã vào đảo** (giảng viên phát).
- Mỗi lần chốt chạy đúng **48 giờ** (giờ máy chủ). Không tua nhanh, không chạy lại, không xoá tiến trình.
- Chốt cần: bản nháp đã lưu, **quá nửa nhóm đồng ý**, **lý do điều chỉnh ≥ 60 ký tự**, chọn **hướng thiết kế**, ≥ 2 bạn trong văn phòng.
- Bảng ý tưởng, nhật ký đóng góp, đánh giá đồng đội, Agency của tuần + bảng xếp hạng lớp.
- **Quản trị** (chỉ tài khoản thinh.dhl3105@gmail.com, nút ⚙ trong game): tạo lớp, thêm agency (dán danh sách “Họ tên - MSSV”), giao brand, xem mã vào đảo, số giờ mỗi lần chạy (đặt nhỏ cho nhóm thử nghiệm), thêm công cụ truyền thông mới, xem chi tiết đóng góp / lý do từng tuần / bảng ý tưởng.

## Supabase (BẮT BUỘC, 1 lần)
Supabase Dashboard → SQL Editor → New query → dán toàn bộ `supabase/migration_v44_medisland.sql` → **Run**.
(An toàn khi chạy lại.) Kênh truyền thông thêm vào lưu ở bảng `site_content` có sẵn (key `medis_channels`).

## Deploy
```bat
git push
```

## Thử nhanh sau khi deploy
1. Đăng nhập tài khoản admin trên Knoworld → mở `/medisland` → ⚙ Quản trị → **+ Lớp mới** → thêm 1 agency thử với MSSV của chính thầy (3 dòng), đặt “Giờ/lần chạy” = 0.05 (3 phút).
2. **▶ Vào đảo như sinh viên** → chọn lớp/agency → nhập MSSV + mã vào đảo.
3. Để thử biểu quyết/có mặt trong văn phòng cần 2 người: mở thêm 1 trình duyệt ẩn danh, đăng nhập bằng MSSV thứ hai.
