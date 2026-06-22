# Knoworld — Deploy v5 (thêm Brand name)

Mã nguồn đã sửa xong & lưu trong thư mục của bạn. Còn 2 bước chạy TRÊN MÁY BẠN.

## Bước 1 — Supabase (thêm cột brand)
Vào **Supabase Dashboard → SQL Editor → New query**, dán toàn bộ file
`supabase/migration_v5.sql` rồi bấm **Run**. (An toàn, chạy lại nhiều lần được.)

Nội dung:
```sql
alter table public.content add column if not exists brand text;
```

## Bước 2 — Đẩy code lên GitHub → Vercel tự deploy
Mở **PowerShell** trên máy bạn:
```powershell
cd "D:\Hồ Sơ\Knowledge App\Knowledge management\knoworld"
del .git\index.lock   # nếu file này tồn tại (xoá lock cũ)
git add .
git commit -m "v5: add Brand name to video + student case studies"
git push origin main
```
Vercel đã nối repo nên `git push` xong là tự build & deploy.

## Kiểm thử sau deploy
- Vào **Upload** → chọn Type = Video Case Study hoặc Student Case Study → thấy ô **Brand name**.
- Tạo thử 1 video có brand → **Publish** → mở trang **Videos**: brand hiện dưới tiêu đề (icon 🏷).
