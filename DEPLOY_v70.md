# DEPLOY v70 — Creative City

## Phòng Ảnh Lạ: admin chỉnh số câu + số giây
- Màn chiếu, tab Ảnh Lạ (ở câu 1, trước khi bắt đầu): khung "Cài đặt lượt chơi" — Số câu (mặc định 10) và Giây mỗi câu (mặc định 5, cho phép 3–120) → Lưu.
  Cũng chỉnh được ở tab Phòng. Lưu theo từng lớp.
- Nút bắt đầu hiện rõ: "▶ Bắt đầu tự động · 10 câu · 5 giây/câu". Hết lượt có nút "🔀 Lượt mới · 10 câu khác" (xáo bộ câu hỏi, chơi tiếp 10 câu khác).
- Điện thoại học sinh hiện "Câu 3/10" theo đúng số câu đã chọn.

## Xưởng Vẽ: vẽ ngang được kể cả khi điện thoại khoá xoay
- Nhiều điện thoại bật khoá xoay dọc (iPhone: Khoá hướng dọc; Android: tắt Tự động xoay) nên trang web không thể tự xoay; iPhone cũng không cho web khoá ngang.
- Giờ bấm "Toàn màn hình" khi máy đang dọc → khung vẽ + công cụ tự quay 90°: học sinh chỉ cần cầm ngang máy là vẽ được, không cần mở khoá xoay.
  Máy nào tự xoay được (hoặc Android tự khoá ngang) thì hiện như bình thường.

## Supabase (BẮT BUỘC, 1 lần)
SQL Editor → dán toàn bộ `supabase/migration_v70_creative_quiz_settings.sql` → Run.

## Deploy
Bấm đúp `push_v70.bat`.
