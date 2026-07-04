# DEPLOY v17 — Case Studies gộp menu + Image Case Studies + sửa search

Phiên bản này gồm 3 nhóm thay đổi:

1. **Sửa ô Search trên thanh menu** — thu nhỏ lại (padding + chiều rộng ô nhập) để không còn đè lên chữ **Reviews**. Khoảng cách giữa các mục menu cũng gọn hơn.
2. **Sửa kết quả tìm kiếm bấm vào không ra nội dung** — giờ mỗi kết quả dẫn thẳng tới đúng nội dung:
   - Video → mở luôn popup xem video (`/videos?v=<id>`).
   - Student case study → trang chi tiết (`/students/<id>`).
   - Image case study → mở luôn gallery hình (`/images?i=<id>`).
3. **Gộp menu + thêm Image Case Studies**:
   - **Video Case Studies** và **Student Case Studies** gộp thành 1 mục **Case Studies** trên thanh menu, bấm vào **xổ xuống** để chọn: Video / Student / Image.
   - Thêm loại mới **Image Case Studies** (`/images`): chỉ cần **tên campaign** (ô Title), **brand** và các **hình ảnh** liên quan. Card hiện tên campaign + brand + ảnh đại diện; bấm vào mở gallery toàn bộ hình.
   - Trang **Upload** có thêm loại **“Image Case Study”** để đăng.

---

## Bước 1 — Chạy SQL trên Supabase

Vào **Supabase Dashboard → SQL Editor → New query**, dán toàn bộ nội dung file:

```
supabase/migration_v17_image_case_studies.sql
```

Nhấn **Run**. Script an toàn khi chạy lại nhiều lần (idempotent). Nó chỉ:

- Thêm giá trị `'image'` vào enum `content_kind` để Image Case Studies dùng chung bảng `content` với video/student.

> Không cần thêm cột hay policy mới — RLS sẵn có trên bảng `content` (published thì công khai, tác giả tự quản lý bài mình) đã bao trọn loại `image`.

---

## Bước 2 — Deploy code lên Vercel

Không cần thêm biến môi trường mới. Chạy trên **máy của bạn** (nơi có file đã sửa):

```bash
cd knoworld
npm run build      # kiểm tra build sạch trước khi đẩy (khuyên chạy)
git add .
git commit -m "v17: gộp Case Studies dropdown + Image Case Studies + fix search deep-link & search box"
git push
```

Vercel tự build & deploy khi nhận push.

> Nếu `git` báo `index.lock`, xoá file `knoworld/.git/index.lock` rồi chạy lại.

---

## Bước 3 — Kiểm tra sau khi lên

1. Trên thanh menu: ô **Search** không còn đè chữ **Reviews**; menu có mục **Case Studies** — bấm vào **xổ xuống** Video / Student / Image.
2. Gõ 1 từ khoá vào ô Search → trang kết quả: bấm 1 kết quả **video** → mở luôn video; bấm **image** → mở luôn gallery; bấm **student** → vào trang chi tiết.
3. Vào **Upload**, chọn Type = **Image Case Study**, nhập tên campaign + brand, tải vài hình → **Publish**. Mở menu **Case Studies → Image Case Studies** để xem.
4. Bộ lọc trên trang Search có thêm chip **Image Cases**.

---

## Ghi chú kỹ thuật

- Image Case Studies dùng lại các cột sẵn có của bảng `content`: `title` (tên campaign), `brand`, `category`, `summary`, `cover_url`, `images[]`. Không có bảng/cột mới.
- Ảnh đại diện thẻ = `cover_url`, nếu trống thì tự lấy hình đầu tiên trong `images[]`.
- Search giờ quét thêm loại `image` (`lib/content.js`) và deep-link từng loại (`app/search/page.js`).
- File mới/đổi:
  - `supabase/migration_v17_image_case_studies.sql`
  - `app/images/page.js` (mới)
  - `app/components/Nav.jsx` — dropdown Case Studies + thu nhỏ search
  - `app/search/page.js` — deep-link + filter Image
  - `app/videos/page.js` — tự mở video từ `?v=<id>`
  - `app/upload/page.js` — thêm loại Image Case Study
  - `lib/content.js` — search thêm loại image + KIND_META
