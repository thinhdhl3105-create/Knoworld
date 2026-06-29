# Knoworld — Deploy v13: Đánh giá website từ người dùng

Tính năng mới: **bảng đánh giá cho khách KHÔNG cần đăng nhập**.

- Trigger **hybrid, không chặn màn hình**: sau khi khách xem **3 nội dung** (mở 3 video
  hoặc 3 student case study), một **toast** trượt lên góc dưới mời đánh giá. Ngoài ra
  luôn có một **nút "Đánh giá" nổi** ở góc phải để ai muốn góp ý lúc nào cũng được.
- Form đánh giá: chấm sao **1–5** (Không tốt → Rất tốt) cho **Sự tiện lợi**, **Nội dung**,
  **Tổng quan**, kèm ô **đóng góp ý kiến** (tùy chọn).
- Khách tắt toast → tạm ẩn 3 ngày rồi mời lại. Đã đánh giá → không tự hỏi lại nữa
  (vẫn bấm nút nổi để đánh giá lại nếu muốn).
- Trang **admin** xem điểm trung bình + danh sách đánh giá tại `/admin/reviews`
  (chỉ tài khoản `thinh.dhl3105@gmail.com` xem được; menu hiện link **"Đánh giá"** khi admin đăng nhập).

Theo dõi ẩn danh bằng `localStorage` (không dùng cookie, không cần tài khoản).

---

## Bước 1 — Supabase

Vào **Supabase Dashboard → SQL Editor → New query**, dán toàn bộ file
**`supabase/migration_v13_reviews.sql`** rồi bấm **Run**.

An toàn, chạy lại nhiều lần được. Nó chỉ **THÊM** bảng `site_reviews` với RLS:
khách (anon) được gửi đánh giá; chỉ admin được đọc. Không đụng dữ liệu cũ.

> Nếu sau này đổi email admin: sửa email trong policy `site_reviews_admin_read`
> (cuối file SQL) và trong hằng `ADMIN_EMAIL` ở `app/admin/reviews/page.js` + `app/components/Nav.jsx`.

## Bước 2 — Đẩy code lên GitHub (chạy trên MÁY BẠN, terminal Windows)

```powershell
cd "D:\Hồ Sơ\Knowledge App\Knowledge management\knoworld"
git add .
git commit -m "v13: user review (3 ratings + comment), hybrid non-blocking prompt, admin reviews page"
git push origin main
```

> Tắt `npm run dev` trước khi push. Nếu lỗi `index file corrupt`: chạy
> `del .git\index` rồi `git reset` trước khi `git add .` (xem DEPLOY.md mục 2).

## Bước 3 — Vercel

Repo đã nối sẵn nên `git push` xong là **tự build & deploy**. Không cần đổi biến môi trường
(vẫn dùng 2 biến Supabase cũ). Mở link Vercel để kiểm tra.

---

## Kiểm thử nhanh sau deploy

- [ ] Mở web ở chế độ ẩn danh (chưa đăng nhập). Thấy **nút "Đánh giá"** nổi ở góc dưới phải.
- [ ] Mở **3 video** (hoặc xem 3 student case study) → **toast** "Bạn thấy trang thế nào?" trượt lên.
- [ ] Bấm **Đánh giá ngay** → chấm 3 mục sao + nhập ý kiến → **Gửi đánh giá** → hiện lời cảm ơn.
- [ ] Tải lại trang: không tự bật lại toast nữa (đã đánh giá xong).
- [ ] Đăng nhập tài khoản admin → menu có link **"Đánh giá"** → mở `/admin/reviews`:
      thấy điểm trung bình + đánh giá vừa gửi.
- [ ] (Tùy chọn) Vào Supabase → Table Editor → `site_reviews`: thấy bản ghi mới.

---

## Các file thay đổi / thêm mới

- `supabase/migration_v13_reviews.sql` — bảng `site_reviews` + RLS *(mới)*
- `lib/reviews.js` — anon id, đếm view, logic mời, submit, thống kê *(mới)*
- `app/components/ReviewWidget.jsx` — nút nổi + toast + form đánh giá *(mới)*
- `app/admin/reviews/page.js` — trang admin xem đánh giá *(mới)*
- `app/layout.js` — gắn `<ReviewWidget />`
- `app/components/Nav.jsx` — link "Đánh giá" cho admin
- `app/videos/page.js` — đếm view khi mở player
- `app/students/[id]/page.js` — đếm view khi mở chi tiết case study

## Tinh chỉnh nhanh (nếu muốn)

- Đổi ngưỡng số nội dung trước khi mời: sửa `VIEW_THRESHOLD` trong `lib/reviews.js` (mặc định 3).
- Đổi thời gian tạm ẩn sau khi khách tắt toast: sửa `SNOOZE_MS` (mặc định 3 ngày).
- Bắt buộc nhập ý kiến: trong `ReviewWidget.jsx`, thêm điều kiện `comment.trim()` vào `canSubmit`.
