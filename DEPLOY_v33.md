# DEPLOY v33 — Nhân vật cư dân

## Có gì mới
- Khi đăng ký (Resident Permit / Visitor Visa), dưới thẻ cư dân có bộ tạo nhân vật: giới tính, kiểu tóc, 11 màu tóc, 6 màu da, 4 biểu cảm, 22 bộ đồ (17 đồ thú bông trùm đầu + 5 đồ thường ngày). Ảnh trên thẻ đổi theo nhân vật.
- Người đã đăng ký từ trước: lần vào web tiếp theo sẽ hiện bảng "Welcome back" bắt tạo nhân vật trước khi vào thành phố.
- Nhân vật lưu ở localStorage (`kw_avatar`) và cột `site_visitors.avatar` trên Supabase.

## Supabase (chạy trước)
Chạy `supabase/migration_v33_citizen_avatar.sql` trong SQL Editor (thêm cột `avatar` + RPC `set_visitor_avatar`).
Nếu chưa chạy, web vẫn hoạt động, nhân vật chỉ lưu trên trình duyệt.

## Deploy
```bat
git add lib/citizenAvatar.js app/components/CitizenAvatar.jsx app/components/avatar.css app/components/VisitorGate.jsx lib/changelog.js supabase/migration_v33_citizen_avatar.sql DEPLOY_v33.md
git commit -m "v33: nhan vat cu dan"
git push
```
