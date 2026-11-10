# DEPLOY v29 — Văn phòng đăng ký công dân + Notice Board tự động

## Có gì mới
**Cổng vào = Civil Registry Office (Form KW-01)**
- 3 loại giấy cư trú: Resident Permit (sinh viên, cần MSSV), City Council Pass (giảng viên, đăng nhập), Visitor Visa (khách).
- Thẻ công dân điền dần khi gõ (tên, MSSV, quận = lĩnh vực, năm sinh), có số công dân KW-26R-xxxxx cố định theo email.
- Chọn lĩnh vực bằng nút "Home district", thêm ô cam kết công dân. Xong thì thẻ được đóng dấu APPROVED → "Enter the city".
- Máy tính: thẻ bên trái, form bên phải. Điện thoại: một cột.
- Logic giữ nguyên: kiểm tra MSSV, lưu site_visitors, đếm lượt ghé, chặn người bị tắt quyền.

**City Notice Board tự cập nhật — không cần nhập tay**
- `lib/changelog.js`: mỗi phiên bản web mới tự hiện trên bảng (Claude thêm 1 dòng mỗi lần sửa web).
- Nội dung mới trong 30 ngày tự thành thông báo: video / student / image case study, research, News, concept (gom theo ngày).
- Tin đăng tay vẫn dùng được (ghim, xoá). Tin tự động không có nút Pin/Remove.

## Supabase
Không cần chạy SQL mới (dùng bảng sẵn có: content, news_items, concepts, announcements).

## Deploy
```bat
git add .
git commit -m "v29: dang ky cong dan thanh pho + notice board tu dong"
git push
```
