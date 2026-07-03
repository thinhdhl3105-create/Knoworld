# DEPLOY v16 — Thả tim + Discussion (hỏi đáp cộng đồng)

Phiên bản này thêm:

1. **Thả tim ❤️** cho **Video Case Studies** và **Student Case Studies**:
   - Nút tim hiện trên từng card video, trong popup xem video, trên card student case study và trang chi tiết.
   - Mỗi trình duyệt (khách) chỉ tim 1 lần cho mỗi mục — bấm lại để bỏ tim.
2. **Trang Discussion** (`/discussion`, có link trên thanh menu):
   - Ai cũng đặt được câu hỏi và trả lời câu hỏi của người khác.
   - Khi đăng, chọn hiển thị **tên mình** (lấy từ tài khoản đăng nhập hoặc tên đã điền ở cổng đăng ký) hoặc **Anonymous**.
   - Thả tim được cho cả **câu hỏi** và **câu trả lời**; sắp xếp theo *Newest* hoặc *Most hearted*.
   - Tự xoá được bài của chính mình; admin xoá được mọi bài.

---

## Bước 1 — Chạy SQL trên Supabase

Vào **Supabase Dashboard → SQL Editor → New query**, dán toàn bộ nội dung file:

```
supabase/migration_v16_hearts_discussion.sql
```

Nhấn **Run**. Script an toàn khi chạy lại nhiều lần (idempotent). Nó sẽ:

- Tạo bảng `hearts` (tim cho content / câu hỏi / câu trả lời, mỗi trình duyệt 1 tim/mục).
- Tạo bảng `discussion_questions` + `discussion_answers` (ai cũng đọc & đăng được; admin xoá được).
- Tạo các RPC: `toggle_heart`, `get_hearts`, `delete_own_question`, `delete_own_answer`.

> Email admin trong policy vẫn là `thinh.dhl3105@gmail.com`. Nếu đổi tài khoản admin, sửa email trong file SQL trước khi chạy.

---

## Bước 2 — Deploy code lên Vercel

Không cần thêm biến môi trường mới.

```bash
cd knoworld
npm run build      # kiểm tra build sạch trước khi đẩy (khuyên chạy)
git add .
git commit -m "v16: hearts for case studies + community discussion (anonymous/named)"
git push
```

Vercel tự build & deploy khi nhận push.

---

## Bước 3 — Kiểm tra sau khi lên

1. Mở **Video Case Studies** → thấy nút ❤️ trên mỗi card; bấm tim → số tăng, bấm lại → bỏ tim.
2. Mở một **Student Case Study** → tim được cả ở card ngoài danh sách lẫn trang chi tiết.
3. Vào **Discussion** trên menu:
   - Bấm **Ask a Question**, thử đăng 1 câu bằng tên mình và 1 câu **Anonymous**.
   - Mở câu hỏi, đăng câu trả lời, thả tim cho câu hỏi/câu trả lời.
   - Thử nút 🗑 xoá bài mình vừa đăng.
4. Đăng nhập admin → có thể xoá mọi câu hỏi / câu trả lời.

---

## Ghi chú kỹ thuật

- Tim tính theo `anon_id` của trình duyệt (localStorage `kw_anon_id`) — không cần đăng nhập; toàn bộ ghi/đọc tim đi qua RPC `SECURITY DEFINER`, bảng `hearts` không mở quyền trực tiếp cho anon.
- Tên hiển thị khi đăng bài: ưu tiên tài khoản đăng nhập (`full_name`/email), nếu không có thì lấy `full_name` từ cổng đăng ký khách. Chưa có tên → chỉ đăng được Anonymous.
- `author_email` được lưu kèm bài đăng (kể cả Anonymous) nhưng **không hiển thị công khai** — chỉ admin xem được trong Supabase nếu cần xử lý nội dung xấu.
- Xoá câu hỏi sẽ xoá luôn các câu trả lời (FK `on delete cascade`). Tim của mục đã xoá không tự xoá khỏi bảng `hearts` (không ảnh hưởng hiển thị).
- File mới/đổi:
  - `supabase/migration_v16_hearts_discussion.sql`
  - `lib/hearts.js`, `lib/discussion.js`
  - `app/components/HeartButton.jsx`
  - `app/discussion/page.js`
  - `app/videos/page.js`, `app/students/page.js`, `app/students/[id]/page.js`, `app/components/Nav.jsx`
