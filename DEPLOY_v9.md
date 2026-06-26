# Knoworld — Deploy v9 (Framework theo các bước / Step-by-step)

Type **Framework** trong trang **Upload** giờ cho phép bạn nhập **các bước (steps)**
để làm một việc gì đó cho một category — ví dụ **IMC Campaign**, **Branding**,
hay **Marketing Strategy**. Mỗi bước có **tiêu đề** + **phần giải thích/hướng dẫn**,
và sinh viên sẽ thấy danh sách bước được đánh số theo thứ tự để làm theo.

Bạn vẫn giữ được ô **Guide / overview** và **file tải về** như cũ (đều là tùy chọn).

## Có gì mới
- **Upload → Framework**: thêm khu **Steps** — thêm/xóa bước, đổi thứ tự (lên/xuống),
  mỗi bước gồm *Title* + *giải thích*.
- **Knowledge Hub → Frameworks**: thẻ framework hiện số bước; bấm **View steps**
  để xem danh sách bước được đánh số 1, 2, 3… kèm hướng dẫn.

---

## Bước 1 — Supabase: thêm cột `steps`
Vào **Supabase Dashboard → SQL Editor → New query**, dán toàn bộ nội dung file
`supabase/migration_v9.sql` rồi bấm **Run**. (Chạy lại nhiều lần vẫn an toàn.)

Nội dung chính:
```sql
alter table public.frameworks
  add column if not exists steps jsonb not null default '[]'::jsonb;
```

> Nếu bạn **chưa** chạy `migration_v8.sql` (tên tạp chí / loại bài báo) thì chạy luôn
> file đó trước cho đủ.

## Bước 2 — Đẩy code lên GitHub → Vercel tự deploy
Mở **PowerShell**:
```powershell
cd "D:\Hồ Sơ\Knowledge App\Knowledge management\knoworld"
git push origin main
```
Vercel đã nối repo nên `git push` xong là tự build & deploy.

> Commit đã được tạo sẵn, nên bạn **không cần** `git add` / `git commit` lại — chỉ cần `git push`.
> (Nếu `git push` báo cần đăng nhập, dùng tài khoản GitHub của bạn như mọi khi.)

## Kiểm thử sau deploy
1. Vào **Upload**, chọn Type = **Framework**.
2. Ở khu **Steps**, bấm **Add step**, nhập tiêu đề + giải thích cho từng bước;
   dùng mũi tên lên/xuống để sắp thứ tự. Chọn Category (vd *IMC Campaign*), Publish.
3. Mở **Knowledge Hub → tab Frameworks** → thẻ hiện *"N steps"* → bấm **View steps**
   để xem các bước đánh số kèm hướng dẫn.
