# DEPLOY v24 — Tương tác & hành trình khám phá (không có quiz)

## Có gì mới
**Trang chủ**
- Hero "vũ trụ sống": nền sao chuyển động theo chuột; các ngôi sao sáng là concept thật, rê chuột xem tên, bấm để mở trên bản đồ.
- Dòng hoạt động trực tiếp (ẩn danh): "Someone hearted …", "New question: …".
- Số liệu chạy đếm (người tham gia, concept, case study, lượt xem).
- Thẻ lật **Concept of the day** (đổi mỗi ngày).
- **Active Learning Flux** thành hành trình cá nhân: Origin → Expansion → Mastery, dựa trên việc đã khám phá.

**Knowledge Hub**
- Bản đồ: cuộn để zoom, kéo nền để di chuyển, nút +/−/reset, rê chuột làm sáng concept liên quan, node to theo số liên kết, tự "bay" tới concept đang chọn.
- Ô "Fly to a concept…", thanh "You've explored x/y", chấm vàng cho concept đã xem.
- Link sâu `/knowledge-hub?c=<id>`.

**Case studies**
- 💡 Insightful · 🤔 Worth debating · 🔥 Inspiring cho video / student / image case.
- Student case: chế độ **Think first, then reveal** (tự nghĩ trước rồi mở Insight → Creative → Execution; ghi chú chỉ lưu trên máy người xem, không chấm điểm). Có nút "Show everything".
- "Watch next / Explore next" gợi ý 3 case cùng concept hoặc cùng nhóm.

**Cộng đồng & động lực**
- Trang **/journey**: streak, lịch 12 tuần, 10 huy hiệu khám phá. Chip 🔥 streak trên thanh menu.
- Discussion: giảng viên (admin) **ghim câu trả lời hay nhất**; gõ `#TenConcept` để thành link tới concept.

**Trải nghiệm chung**
- **Ctrl + K** (hoặc phím `/`): tìm nhanh concept, case, trang.
- Khung chờ (skeleton), chuyển trang mượt, toast thông báo, hiệu ứng khi thả tim.
- Tour 3 bước cho người mới (sau khi qua cổng đăng ký).
- Đánh giá bắt buộc lần ghé thứ 3: không còn chặn toàn màn hình, thành bảng ở góc, thu gọn được, vẫn giữ đến khi gửi.
- Thanh điều hướng dưới cùng trên điện thoại.

## Supabase
Chạy `supabase/migration_v24_engagement.sql` trong SQL Editor (an toàn khi chạy lại).
Chưa chạy thì web vẫn hoạt động, chỉ ẩn streak / reactions / hoạt động trực tiếp.

## Deploy
```bat
git add .
git commit -m "v24: tuong tac, hanh trinh kham pha, streak, reactions, Ctrl+K"
git push
```
