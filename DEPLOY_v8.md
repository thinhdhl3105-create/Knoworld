# Knoworld — Deploy v8 (Tên tạp chí + Loại bài báo)

Form **Upload → Research Paper** giờ có thêm 2 ô:
- **Journal / publication name** — tên tạp chí / hội nghị / sách nơi xuất bản.
- **Type** — chọn **Research Article**, **Conference**, hoặc **Book Chapter**.

Thông tin này hiển thị lại trong cửa sổ đọc bài ở trang **Research** (dòng "Tên tạp chí · Loại").

Code đã được **commit sẵn** (commit `52847bb`). Chỉ còn 2 bước bạn làm trên máy mình.

---

## Bước 1 — Supabase: thêm 2 cột
Vào **Supabase Dashboard → SQL Editor → New query**, dán toàn bộ nội dung file
`supabase/migration_v8.sql` rồi bấm **Run**. (Chạy lại nhiều lần vẫn an toàn.)

Nội dung chính:
```sql
alter table public.content add column if not exists publication text;
alter table public.content add column if not exists paper_type  text;
update public.content set paper_type = 'article'
  where kind = 'research' and is_foundation = false and paper_type is null;
```

## Bước 2 — Đẩy code lên GitHub → Vercel tự deploy
Mở **PowerShell**:
```powershell
cd "D:\Hồ Sơ\Knowledge App\Knowledge management\knoworld"
git push origin main
```
Vercel đã nối repo nên `git push` xong là tự build & deploy.

> Ghi chú: commit đã tạo sẵn rồi, nên bạn **không cần** `git add`/`git commit` lại — chỉ cần `git push`.

## Kiểm thử sau deploy
1. Vào **Upload**, chọn Type = **Research Paper** → thấy ô **Journal / publication name** và ô **Type** (Research Article / Conference / Book Chapter).
2. Nhập tên tạp chí, chọn loại, Publish.
3. Mở trang **Research** → bấm vào bài → thấy dòng "Tên tạp chí · Loại" dưới tên tác giả.
