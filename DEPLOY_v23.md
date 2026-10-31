# DEPLOY v23 — Nhập concept hàng loạt cho Knowledge Hub

## Có gì mới
Trang **/knowledge-hub/import** (nút "Import from slides / Excel" trên Knowledge Hub, cần đăng nhập):
- Tải lên **.pptx** (mỗi slide có tiêu đề = 1 concept), **.docx** (mỗi Heading = 1 concept),
  hoặc **.xlsx/.csv theo mẫu** (Concept | Tóm tắt | Nội dung | Nhóm | Tags | Liên kết với).
- Tự bỏ slide bìa / mục tiêu / cảm ơn / Q&A, gộp slide "(tiếp)", lấy speaker notes.
- Tự gợi ý liên kết: theo thứ tự bài, concept cha–con (Word), nhắc tên concept khác.
- Bảng xem trước sửa được, tải bảng ra Excel, nút Hoàn tác sau khi nhập.
- Nút tải file Excel mẫu + copy lời nhắc để nhờ Claude tóm tắt slide vào mẫu.

## File thay đổi
- `lib/conceptImport.js` (mới), `app/knowledge-hub/import/page.js` (mới)
- `app/knowledge-hub/page.js` (thêm nút Import), `package.json` (thêm `jszip`)

## Supabase
Không cần chạy SQL (dùng bảng concepts / concept_links sẵn có).

## Deploy
```bat
git add .
git commit -m "v23: nhap concept hang loat tu pptx/docx/xlsx"
git push
```
