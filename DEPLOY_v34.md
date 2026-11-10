# DEPLOY v34 — Lucky Cards có logo trên Game Island

## Có gì mới
- Game 2 trên Game Island đổi thành **Lucky Cards**: 20 lá bài úp đánh số 1–20. Mỗi nhóm (theo thứ tự đua thuyền) chọn một số, lá bài lật ra **5 thương hiệu**.
- Khung lớn phía trên hiện **5 logo** của lá vừa lật; mặt lá bài chỉ ghi tên cho gọn.
- Không nhóm nào trùng thương hiệu (100 thương hiệu khác nhau cho 20 lá). Đổi được số lá, số thương hiệu mỗi lá.
- Undo lượt vừa chọn, lật các lá còn lại khi xong, thêm nhóm, copy kết quả.
- Bộ **140 logo** từ thư mục Brand Collection, đã thu nhỏ (~0,8 MB) trong `public/brands/`, tên thương hiệu trong `lib/brandLogos.js`. Thương hiệu tự gõ thêm không có logo thì hiện ô chữ cái.
- Giảng viên: 💾 lưu danh sách mặc định, 📣 Publish brands (ghi cả số lá) → hiện cuối trang + City Notice Board.

## Supabase
Không cần chạy SQL mới (dùng bảng `game_rounds` từ v31 và `site_content`).
Lưu ý: nếu trước đây đã bấm "Save brand list" thì danh sách cũ sẽ được dùng; bấm lại "Save brand list" sau khi dán danh sách 140 thương hiệu nếu muốn có logo.

## Deploy
```bat
git add .
git commit -m "v34: Lucky Cards co logo tren Game Island"
git push
```
