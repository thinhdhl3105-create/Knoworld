# DEPLOY v36 — Knoworld Temple (đảo chùa)

## Có gì mới
- Đảo mới **Temple Isle** trên bản đồ thành phố, nối Game Island bằng phà (thuyền cam chạy qua lại).
- Trang `/temple`: game pixel đi vòng quanh chùa (phím mũi tên / WASD, Shift chạy, Space tương tác; điện thoại có phím ảo A/B).
  - Nhà mõ: gõ đều tay để tích công đức (tối đa 200/ngày, gõ quá nhanh không được tính).
  - Quầy nhang cổng chùa: đổi công đức lấy nhang thường, nhang trầm, hoa sen, mâm trái cây.
  - Chánh điện: xin xăm (16 quẻ, Thượng Thượng → Hạ) hoặc hỏi Thầy Phán (9 câu hỏi; tình duyên cần hoa sen, việc làm/tiền bạc cần trái cây).
  - Chú tiểu, sinh viên, mèo chùa (+1 công đức/ngày), biển chỉ dẫn, hồ sen, cây bồ đề. Ban đêm (giờ VN) đèn lồng sáng.
- Menu trên có mục **Temple**; Game Island có thẻ "Ferry to Temple Isle"; City Notice Board tự báo tin mới.
- Muốn sửa câu hỏi / lời phán / quẻ xăm / giá đồ: mở `lib/templeGame.js`, phần "NỘI DUNG" ở đầu file.

## Supabase (chạy trước)
Chạy `supabase/migration_v36_temple.sql` trong SQL Editor (thêm cột `site_visitors.temple` + RPC `set_visitor_temple`, `get_visitor_temple`).
Nếu chưa chạy, game vẫn chơi được, công đức chỉ lưu trên trình duyệt.

## Deploy
```bat
git add .
git commit -m "v36: Knoworld Temple - dao chua, go mo, quay nhang, xin xam, hoi Thay Phan"
git push
```
(Lệnh push này đẩy luôn bản v35 đang chờ.)
