# DEPLOY v14 — Cổng đăng ký người xem + gắn danh tính vào đánh giá

Phiên bản này thêm:
1. **Cổng đăng ký (Visitor Gate)** — chặn cứng lần đầu: khách phải điền **họ tên, email, năm sinh, lĩnh vực muốn tìm hiểu** (IMC, Creative, Branding…) trước khi xem nội dung. Sau khi điền, thông tin lưu vào trình duyệt nên lần sau không hỏi lại.
2. **Gắn người xem ↔ đánh giá** — mỗi đánh giá (Rate us) nay kèm danh tính người điền form, để bạn biết *ai* đánh giá và đánh giá *thế nào*.
3. **Trang admin mới `/admin/visitors`** — danh sách toàn bộ người ra vào, lọc theo lĩnh vực, tìm theo tên/email.
4. Trang `/admin/reviews` hiển thị thêm tên, email, lĩnh vực, năm sinh của người đánh giá.

---

## Bước 1 — Chạy SQL trên Supabase

Vào **Supabase Dashboard → SQL Editor → New query**, dán toàn bộ nội dung file:

```
supabase/migration_v14_visitors.sql
```

Nhấn **Run**. Script an toàn khi chạy lại nhiều lần (idempotent). Nó sẽ:
- Tạo bảng `site_visitors` (người ra vào) với RLS: khách được ghi, chỉ admin đọc.
- Thêm các cột `visitor_id, visitor_name, visitor_email, visitor_field, visitor_birth_year` vào bảng `site_reviews`.
- Tạo view tiện tra cứu `visitor_reviews`.

> Email admin trong policy đang là `thinh.dhl3105@gmail.com`. Nếu đổi tài khoản admin, sửa email trong file SQL trước khi chạy.

---

## Bước 2 — Deploy code lên Vercel

Không cần thêm biến môi trường mới (vẫn dùng `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` như cũ).

Cách A — qua Git (khuyên dùng):

```bash
cd knoworld
git add .
git commit -m "v14: visitor gate + link visitor to reviews"
git push
```

Vercel tự build và deploy khi nhận push.

Cách B — Vercel CLI:

```bash
cd knoworld
vercel --prod
```

---

## Bước 3 — Kiểm tra sau khi lên

1. Mở web bằng cửa sổ ẩn danh (incognito) → phải thấy **cổng đăng ký** chặn màn hình.
2. Điền họ tên + email + năm sinh + lĩnh vực → nhấn **Vào khám phá** → cổng biến mất, xem được nội dung.
3. Xem vài nội dung → nhấn **Rate us** ở góc phải → gửi đánh giá.
4. Đăng nhập tài khoản admin, vào:
   - `/admin/visitors` → thấy người vừa đăng ký.
   - `/admin/reviews` → thấy đánh giá kèm tên/email/lĩnh vực người đó.

---

## Ghi chú kỹ thuật

- Cổng **không** hiện trên `/login` và `/admin/*` để bạn vẫn đăng nhập quản trị được.
- Trạng thái "đã đăng ký" lưu ở `localStorage` key `kw_visitor`. Muốn test lại cổng: xoá key này (DevTools → Application → Local Storage) hoặc mở cửa sổ ẩn danh.
- Nếu chưa cấu hình Supabase, cổng vẫn cho vào (chế độ demo, chỉ lưu cục bộ) — không mất dữ liệu người dùng thật.
- File mới/đổi:
  - `supabase/migration_v14_visitors.sql`
  - `lib/visitor.js`, `lib/reviews.js`
  - `app/components/VisitorGate.jsx`, `app/layout.js`, `app/components/Nav.jsx`
  - `app/admin/visitors/page.js`, `app/admin/reviews/page.js`
