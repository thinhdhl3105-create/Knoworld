# Knoworld — Deploy v6 (Publish / Ẩn từng video & case study)

Bạn giờ là người kiểm soát: mỗi video / case study (và concept, framework) có thể **Công khai** hoặc **Ẩn**. Mục Ẩn biến mất khỏi các trang công khai (Videos, Students, Research, Knowledge Hub, Search) — chỉ bạn thấy trong khu quản lý ở trang **Upload**.

Cách dùng sau khi deploy:
- **Lúc tạo entry:** trong form Upload có ô tick **"Công khai (Published)"**. Để nguyên = hiện ngay; bỏ tick = tạo ở dạng **Ẩn (Draft)**.
- **Sau khi tạo:** ở cột **Your entries** mỗi mục có nhãn ● Công khai / ○ Ẩn và nút **Ẩn / Công khai** để bật tắt 1 chạm.

---

## Bước 1 — Supabase (an toàn, gần như không cần)
Cột `published` ĐÃ có sẵn trong DB nên app chạy được ngay. File `supabase/migration_v6.sql` chỉ để chắc chắn + thêm index. Muốn chạy: vào **Supabase Dashboard → SQL Editor → New query**, dán toàn bộ `supabase/migration_v6.sql` rồi **Run**. (Chạy lại nhiều lần vẫn an toàn.)

## Bước 2 — Đẩy code lên GitHub → Vercel tự deploy
Mở **PowerShell** trên máy bạn:
```powershell
cd "D:\Hồ Sơ\Knowledge App\Knowledge management\knoworld"
del .git\index.lock   # nếu file này tồn tại (xoá lock cũ)
git add .
git commit -m "v6: publish/hide toggle for content, concepts, frameworks"
git push origin main
```
Vercel đã nối repo nên `git push` xong là tự build & deploy.

## Kiểm thử sau deploy
1. Vào **Upload**, tạo 1 video → **bỏ tick** "Công khai" → Publish. Mở trang **Videos**: video đó **không** hiện.
2. Về **Upload**, ở mục đó bấm **Công khai** → mở lại **Videos**: video hiện ra.
3. Bấm **Ẩn** lại để giấu. Nhãn ●/○ đổi theo trạng thái.
