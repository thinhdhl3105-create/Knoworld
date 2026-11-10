# DEPLOY v31 — Game Island

## Có gì mới
**Đảo mới trên thành phố 3D: Game Island** (ai cũng thấy)
- Vòng đu quay quay chậm, bể đua thuyền, biển quảng cáo neon. Thuyền chạy vòng quanh đảo, phà xanh nối Profile City.
- Nút "Game Island" trên thanh quận và trên menu chính. Trang `/games` có đầu trang riêng (đu quay + biển GAME ISLAND).

**Harbour Cup — đua thuyền chọn thứ tự thuyết trình**
- Chọn 10/20/30/45/60 giây, đếm ngược 3-2-1, tốc độ thay đổi liên tục, bình luận người dẫn đầu.
- Thuyền cuối về đích đúng lúc hết giờ. Thứ tự về đích = thứ tự thuyết trình. Copy kết quả.

**Billboard Draw — mỗi nhóm 5 thương hiệu, không trùng giữa các nhóm**
- Danh sách thương hiệu sửa được, số thương hiệu mỗi nhóm đổi được, "+ Add group" thêm nhóm ngay.
- Báo khi thiếu thương hiệu; Redraw từng nhóm; Copy kết quả.

**Dành cho giảng viên (tài khoản admin)**
- 💾 Lưu danh sách nhóm / thương hiệu làm mặc định (lần sau mở là có sẵn).
- 📣 Publish: công bố thứ tự thuyết trình / thương hiệu → hiện ở cuối trang Game Island và tự lên City Notice Board.

## Supabase (chạy trước)
Chạy `supabase/migration_v31_game_island.sql` trong SQL Editor (bảng `game_rounds`: ai cũng đọc, chỉ admin công bố).
Danh sách mặc định dùng bảng `site_content` có sẵn.

## Deploy
```bat
git add .
git commit -m "v31: Game Island - dua thuyen + boc thuong hieu"
git push
```
