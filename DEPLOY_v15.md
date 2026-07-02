# DEPLOY v15 — Thống kê người ra vào + ép đánh giá + số liệu công khai

Phiên bản này thêm:

1. **Trang admin `/admin/visitors` — thêm cột:**
   - **Visits** — số lần truy cập web của mỗi người.
   - **Last visit** — lần truy cập gần nhất.
   - **Peak hour** — khung giờ hay vào nhất (vd `20:00–21:00`).
   - **Avg time** — thời lượng trung bình mỗi lần ở web.
   - **Reviewed** — đã đánh giá web hay chưa (Yes/No).
   - **Access** — nút **Block / Unblock** để tắt quyền truy cập của email không hợp lệ.
2. **Ép đánh giá (chặn cứng):** đến **lần truy cập thứ 3**, khách buộc phải đánh giá — popup không thể tắt cho tới khi gửi đánh giá.
3. **Số liệu công khai ở trang chủ:** hiển thị *"X người đã tham gia Knoworld"* (chỉ con số, không lộ danh sách).
4. **Chặn truy cập:** khi admin bấm Block, lần vào sau người đó thấy màn hình "Access disabled".

---

## Bước 1 — Chạy SQL trên Supabase

Vào **Supabase Dashboard → SQL Editor → New query**, dán toàn bộ nội dung file:

```
supabase/migration_v15_visitor_stats.sql
```

Nhấn **Run**. Script an toàn khi chạy lại nhiều lần (idempotent). Nó sẽ:

- Thêm cột `visit_count, last_visit_at, total_active_seconds, hour_histogram, blocked` vào bảng `site_visitors`.
- Cho phép **admin cập nhật** (bật/tắt `blocked`).
- Tạo 3 hàm (RPC) cho khách ẩn danh gọi được:
  - `record_visit(anon_id, local_hour)` — ghi 1 lần truy cập, trả về `visit_count` + `blocked`.
  - `record_session_duration(anon_id, seconds)` — cộng dồn thời lượng ở web.
  - `public_visitor_count()` — số người đã đăng ký (để hiện công khai ở trang chủ).

> Email admin trong policy vẫn là `thinh.dhl3105@gmail.com`. Nếu đổi tài khoản admin, sửa email trong file SQL trước khi chạy.

---

## Bước 2 — Deploy code lên Vercel

Không cần thêm biến môi trường mới (vẫn dùng `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

```bash
cd knoworld
npm run build      # kiểm tra build sạch trước khi đẩy (khuyên chạy)
git add .
git commit -m "v15: visit stats, mandatory review on 3rd visit, public counter, block access"
git push
```

Vercel tự build & deploy khi nhận push.

---

## Bước 3 — Kiểm tra sau khi lên

1. Mở web bằng cửa sổ ẩn danh → đăng ký (đây là **lần truy cập 1**).
2. Đóng tab, mở tab ẩn danh mới **cùng trình duyệt** → **lần 2**; lặp lại → **lần 3**: popup đánh giá **bắt buộc**, không tắt được cho tới khi gửi.
3. Trang chủ hiển thị *"… người đã tham gia Knoworld"*.
4. Đăng nhập admin → `/admin/visitors`:
   - Thấy các cột Visits / Last visit / Peak hour / Avg time / Reviewed.
   - Bấm **Block** một người → mở web bằng trình duyệt của người đó (hoặc xoá `localStorage`), lần vào sau thấy **"Access disabled"**. Bấm **Unblock** để mở lại.

---

## Ghi chú kỹ thuật

- "Lần truy cập" đếm **1 lần mỗi phiên trình duyệt** (dùng `sessionStorage`); reload cùng tab không cộng thêm.
- Lượt **đăng ký tính là lần truy cập 1**.
- "Đã đánh giá" ở trang admin được suy ra bằng cách đối chiếu `visitor_id`/`email` giữa `site_visitors` và `site_reviews`.
- Thời lượng đo bằng nhịp 20 giây khi tab đang hiển thị, cộng dồn vào `total_active_seconds`; trung bình = `total_active_seconds / visit_count`.
- Khung giờ hay vào lấy từ mảng `hour_histogram[24]` (đếm theo giờ địa phương của khách).
- File mới/đổi:
  - `supabase/migration_v15_visitor_stats.sql`
  - `lib/visitor.js`
  - `app/components/VisitorGate.jsx`, `app/components/ReviewWidget.jsx`
  - `app/page.js`, `app/admin/visitors/page.js`

---

## ⚠️ Lưu ý về đồng bộ file (đọc trước khi commit)

Thư mục `knoworld` trước đó có một số file bị **hỏng do lỗi đồng bộ** (chèn null byte / cắt cụt). Mình đã khôi phục các file đó từ commit tốt gần nhất (`cc1727e`) rồi mới thêm tính năng mới.

**Trước khi `git push`, hãy chạy để chắc chắn file trên máy sạch:**

```bash
cd knoworld
git status          # phải thấy các file v15 ở trạng thái "modified"
git diff --stat     # xem thay đổi có hợp lý không
npm run build       # PHẢI build thành công, không lỗi cú pháp
```

Nếu `npm run build` báo lỗi kiểu *"Unexpected eof"* hoặc file trông bị cắt ngang, nghĩa là bản lưu trên đĩa chưa đầy đủ — nhắn lại để mình ghi lại file cho bạn.
