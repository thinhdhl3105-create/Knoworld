# DEPLOY v21 — Thumbnail News · Gộp Visitors trùng · Knowledge Hub công khai

## Có gì mới
1. **News có thumbnail**: admin dán link bài báo → hệ thống tự lấy ảnh đại diện
   (og:image) của bài để làm thumbnail. Có ô dán URL ảnh khác nếu muốn thay.
   Ảnh hỏng/chặn hotlink → card tự ẩn ảnh, hiển thị như cũ.
2. **Visitors gộp dòng trùng**: cùng một người (theo email) đăng ký nhiều lần
   (đổi máy, xoá localStorage…) giờ chỉ hiện **1 dòng**: tổng visits, last visit
   mới nhất, peak hour & avg time tính trên toàn bộ, Registered = lần đầu.
   Dòng có badge `×N` → bấm để xem lịch sử từng lần đăng ký.
   **Block / Allow access** áp dụng cho tất cả bản ghi của người đó.
3. **Knowledge Hub công khai**: không cần đăng nhập (giống News). Research
   Archive vẫn yêu cầu đăng nhập.

## Thay đổi file
- `supabase/migration_v21_news_thumbnails.sql` (mới): thêm cột `image_url` vào `news_items`.
- `app/api/og/route.js` (mới): API server-side lấy og:image từ link bài báo (tránh CORS).
- `lib/news.js`: thêm `fetchOgImage()`; `addNews()` lưu `image_url`.
- `app/news/page.js`: form admin tự tìm thumbnail khi dán link + ô sửa tay; card hiện ảnh.
- `app/admin/visitors/page.js`: gộp theo email, badge ×N, lịch sử mở rộng.
- `app/knowledge-hub/page.js` + `app/components/Nav.jsx`: bỏ yêu cầu đăng nhập.

## Supabase — CẦN chạy 1 lần
**Dashboard > SQL Editor > New query**, dán nội dung
`supabase/migration_v21_news_thumbnails.sql` rồi **Run**. (Chạy lại nhiều lần vẫn an toàn.)

```sql
alter table public.news_items add column if not exists image_url text;
```

Không cần đổi RLS: Knowledge Hub đọc các bảng `concepts / frameworks /
concept_links` vốn đã cho phép đọc công khai (`published = true`).

## Deploy lên Vercel (chạy trên MÁY CỦA BẠN — nơi có GitHub login)
```bash
cd knoworld
# nếu báo index.lock: del .git\index.lock   (Windows)  /  rm -f .git/index.lock (mac/linux)
npm run build          # kiểm tra build sạch (khuyên chạy)
git add .
git commit -m "v21: thumbnail News (og:image), gộp visitors trùng theo email, Knowledge Hub công khai"
git push               # Vercel tự build & deploy
```

## Kiểm tra sau khi lên
1. **News** (đăng nhập admin) → Add News → dán link bài báo, rời ô nhập →
   ô thumbnail tự điền ảnh + có preview. Publish → card hiện ảnh bên trái tiêu đề.
2. Tin cũ (chưa có ảnh) vẫn hiển thị bình thường, không vỡ layout.
3. **Admin > Visitors**: người đăng ký nhiều lần chỉ còn 1 dòng, có badge `×N`.
   Bấm dòng → xem lịch sử. Thử Block → mọi bản ghi của người đó bị chặn.
4. **Knowledge Hub**: mở khi CHƯA đăng nhập → xem được map & frameworks.
