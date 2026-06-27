# Knoworld — Deploy v10 (Sub-steps + khung framework tương tác)

## Có gì mới
- **Upload → Framework → Steps**: mỗi bước giờ có thêm **sub-steps** (bước nhỏ)
  bên trong — mỗi sub-step có *tiêu đề* + *phần giải thích*, thêm/xóa/đổi thứ tự
  được. Đánh số kiểu `1.1`, `1.2`…
- **Knowledge Hub → Frameworks → View steps**: thay danh sách tĩnh bằng **khung
  tương tác giống concept map**. Hiện ra các bước (node đánh số) ở cột trái; **bấm
  vào bước nào** thì cột phải mới hiển thị nội dung bước đó + các sub-step liên quan
  kèm giải thích.

## Supabase — KHÔNG cần migration mới
Cột `steps` là `jsonb` (đã thêm ở v9) nên sub-steps lồng vào thẳng, không cần
chạy SQL gì thêm. (Nếu chưa chạy `migration_v9.sql` thì chạy file đó.)

## Đẩy lên Vercel
```powershell
cd "D:\Hồ Sơ\Knowledge App\Knowledge management\knoworld"
git push origin main
```
Commit đã tạo sẵn — chỉ cần `git push`. Vercel tự build & deploy.

## Kiểm thử sau deploy
1. **Upload** → Type = **Framework** → khu **Steps**: thêm bước, trong mỗi bước
   bấm **Add sub-step** để thêm bước nhỏ + giải thích. Publish.
2. **Knowledge Hub → tab Frameworks** → thẻ → **View steps** → bấm từng bước để
   xem nội dung + sub-step hiện ra ở khung bên phải.
