# Knoworld — Hướng dẫn deploy (Supabase + Vercel)

Làm theo đúng thứ tự dưới đây. Mỗi phần chỉ mất vài phút.

---

## 0. Trước khi bắt đầu — tắt dev server & dọn rác

1. **Dừng `npm run dev`** đang chạy (nhấn `Ctrl + C` trong terminal đang chạy nó).
   Khi server còn chạy, nó khóa các file trong `.git` và `.next`, khiến không
   commit/push được.
2. **Xóa thủ công thư mục `_kbcheck`** (nếu có) trong `knoworld\` và trong thư mục
   `outputs\`. Đây là thư mục test tạm, đã được thêm vào `.gitignore` nên không bị
   commit, nhưng nên xóa cho gọn (xóa bằng File Explorer).

---

## 1. Cập nhật Supabase (xóa dữ liệu mẫu + áp schema mới)

Vào **Supabase Dashboard → SQL Editor → New query**, dán nội dung file và bấm **Run**.

- **Database đã có sẵn (đang chạy):** chạy file **`supabase/cleanup_foundations.sql`**
  — chỉ xóa 5 mục "Theoretical Foundations" mẫu, KHÔNG đụng tới case study / video
  bạn đã đăng.
- **Muốn cập nhật toàn bộ cấu trúc** (concept linking, frameworks…): chạy thêm
  **`supabase/migration_v2.sql`** (an toàn, chạy lại nhiều lần được; bản này đã sửa
  để chỉ xóa 5 mục mẫu, không còn xóa sạch toàn bộ `content` như trước).
- **Project Supabase hoàn toàn mới:** chỉ cần chạy **`supabase/schema.sql`** (đã bỏ
  phần seed mẫu, các bảng sẽ trống sẵn để bạn tự nhập).

> Sau khi chạy, vào **Table Editor → content**: phần `is_foundation = true` đã trống.

### Cấu hình Auth (để đăng nhập hoạt động)

Vào **Authentication → Providers → Email**:
- Bật **Email** provider.
- Nếu muốn đăng nhập được ngay sau khi đăng ký mà không cần mở email xác nhận,
  **tắt "Confirm email"**. Nếu để bật, người đăng ký phải bấm link trong email trước.

---

## 2. Đưa code lên GitHub

Repo: `https://github.com/thinhdhl3105-create/Knoworld.git`

> ⚠️ Git index hiện đang lỗi ("index file corrupt"). Sửa nhanh (chạy sau khi đã
> tắt dev server ở bước 0):

```bash
cd "D:\Hồ Sơ\Knowledge App\Knowledge management\knoworld"

# 1) Sửa index hỏng (xóa và dựng lại từ commit hiện tại — không mất code)
del .git\index
git reset

# 2) Kiểm tra & commit
git status
git add .
git commit -m "Auth-gate Knowledge Hub & Research; concept<->case study links; remove seed foundations"

# 3) Push
git push origin main
```

Nếu `git reset` vẫn báo lỗi đọc object, cách chắc chắn nhất là clone lại repo sạch
rồi copy các file đã sửa vào — nhưng thường các lệnh trên là đủ.

---

## 3. Deploy lên Vercel

Cách dễ nhất: **nối GitHub repo với Vercel**, sau đó mỗi lần push là tự deploy.

1. Vào https://vercel.com → **Add New… → Project**.
2. **Import** repo `Knoworld` từ GitHub. (Nếu trước đây đã import rồi thì bỏ qua,
   chỉ cần push ở bước 2 là Vercel tự build.)
3. Framework: Vercel tự nhận **Next.js** — giữ nguyên mặc định.
4. Mở **Environment Variables**, thêm 2 biến (lấy từ Supabase → Project Settings → API):

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://qbbdpixcpgszbhlsothm.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(anon public key của bạn)* |

   > 2 biến này đang nằm trong `.env.local` ở máy bạn. File đó KHÔNG được đẩy lên
   > (đã gitignore), nên **bắt buộc** nhập lại trên Vercel.

5. Bấm **Deploy**. Xong sẽ có link dạng `https://knoworld.vercel.app`.

Các lần sau chỉ cần `git push` → Vercel tự build lại.

---

## 4. Kiểm tra sau khi deploy

- [ ] Mở web ở chế độ ẩn danh (chưa đăng nhập): menu chỉ có **Video Case Studies**
      và **Student Case Studies**. Vào thẳng `/research` hoặc `/knowledge-hub` → bị
      chuyển về trang đăng nhập.
- [ ] Đăng nhập → thấy đủ **Research Archive** và **Knowledge Hub**.
- [ ] Phần Theoretical Foundations trống (đã xóa mẫu).
- [ ] Trong Upload: tạo 1 Concept, rồi tạo 1 Video / Student có chọn concept đó →
      mở concept trong Knowledge Hub thấy mục "Related video/student case studies"
      và bấm sang được.

---

## Tóm tắt thay đổi lần này

- Xóa toàn bộ 5 mục Theoretical Foundations mẫu (sửa SQL + thêm file dọn DB
  `cleanup_foundations.sql`).
- **Knowledge Hub** và **Research Archive** chỉ hiện khi đã đăng nhập; khách chưa
  đăng nhập chỉ xem được Video & Student Case Studies (ẩn link + chặn truy cập thẳng URL).
- Concept liên kết 2 chiều: Student Case Study giờ cũng chọn được concept (như Video),
  và panel concept trong Knowledge Hub hiển thị danh sách case study liên quan, bấm sang được.

## Ghi chú
- Next.js cài trong `node_modules` là **v16** (Turbopack) dù `package.json` ghi `^14`.
  Vercel sẽ cài theo `package.json`. Nếu muốn khớp đúng v16, đổi dòng `"next": "^14.2.33"`
  thành `"next": "^16"` trong `package.json` rồi `npm install` lại. Không bắt buộc.
- RLS đang bật: ai cũng đọc được nội dung published; chỉ tác giả mới sửa/xóa của mình.
