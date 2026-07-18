# DEPLOY v20 — Tính năng News (cập nhật thị trường)

Thêm mục **News** trên thanh menu. **Ai cũng xem được** (kể cả khách chưa đăng nhập).
Chỉ **admin** (`thinh.dhl3105@gmail.com`) mới thấy form thêm tin và nút xoá.

Admin thêm tin bằng: **link bài báo** + **tiêu đề** + **năm** + **nhãn phân loại**
(Crisis / Market Update / Trend / Regulation / General) + mô tả ngắn (tùy chọn).
Mục đích: cập nhật thông tin thị trường, khủng hoảng (crisis) và các cập nhật mới.

## Thay đổi
- `supabase/migration_v20_news.sql` (mới): bảng `news_items`. RLS: ai cũng `select`,
  chỉ admin `insert / update / delete`.
- `lib/news.js` (mới): `fetchNews()`, `addNews()`, `deleteNews()`, danh sách nhãn
  `NEWS_CATEGORIES`, tiện ích `sourceHost()` (hiện tên nguồn từ URL).
- `app/news/page.js` (mới): trang News công khai — danh sách tin (mới nhất trước),
  bộ lọc theo nhãn, form thêm tin cho admin, nút xoá cho admin. Mỗi tiêu đề mở
  bài gốc ở tab mới (`target="_blank"`, `rel="noopener noreferrer"`).
- `app/components/Nav.jsx`: thêm mục **News** (công khai) vào thanh menu, giữa
  Case Studies và Discussion.

## Supabase — CẦN chạy 1 lần
Vào **Supabase Dashboard > SQL Editor > New query**, dán toàn bộ nội dung file
`supabase/migration_v20_news.sql` rồi **Run**. (An toàn nếu chạy lại nhiều lần.)
Nếu tài khoản admin đổi email, sửa email trong các policy của file SQL này.

## Deploy lên Vercel (chạy trên MÁY CỦA BẠN — nơi có GitHub login)
```bash
cd knoworld
# nếu báo index.lock: del .git\index.lock   (Windows)  /  rm -f .git/index.lock (mac/linux)
npm run build          # kiểm tra build sạch (khuyên chạy)
git add .
git commit -m "v20: tính năng News (cập nhật thị trường) — admin thêm link + tiêu đề + năm + nhãn"
git push               # Vercel tự build & deploy
```

## Kiểm tra sau khi lên
1. Mở **/news** khi CHƯA đăng nhập → vẫn xem được danh sách tin, không thấy form/nút xoá.
2. Đăng nhập admin → xuất hiện nút **Add News**. Bấm, dán link bài báo, nhập tiêu đề +
   năm + chọn nhãn → **Publish**. Tin hiện ngay đầu danh sách.
3. Bấm tiêu đề → mở bài gốc ở tab mới.
4. Thử **bộ lọc** theo nhãn (Crisis / Market Update…). Bấm nút **xoá** (admin) → tin biến mất.
