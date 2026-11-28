# DEPLOY v68 — Creative City

## Phòng Ảnh Lạ
- **Sửa lỗi** bấm "Bắt đầu" ở câu 2 lại quay về câu 1 (máy chủ đặt số câu về 0 khi không gửi số câu).
- **Tự chạy**: bấm "▶ Bắt đầu tự động" một lần → mỗi câu 10 giây → hết giờ hiện đáp án (5 giây) → bảng điểm (5 giây) → tự sang câu tiếp, tới hết bộ câu hỏi.
  Có nút "⏸ Tạm dừng" và "▶ Tự chạy tiếp". Lớp mới mặc định 10 giây/câu.

## Xưởng Vẽ — trò mới "⚡ Vẽ tiếp 30s"
- Khung vẽ có sẵn nửa bức tranh (nửa con ngựa, nửa con cá, nửa ấm trà, nửa mặt mèo, nửa gà trống, nửa ô tô, nửa tên lửa, nửa con voi, nửa ngôi nhà, nửa cây đàn).
- Học sinh bấm "Bắt đầu 30 giây", vẽ nốt nửa phải thành thứ khác hẳn (nửa ngựa nửa cọp…). Hết 30 giây khoá bút, mang tranh sang Phòng Tranh (đề ghi "Vẽ tiếp: nửa …").

## Lớp theo khu + QR
- "Tạo lớp mới" giờ chọn khu: Ảnh Lạ / Xưởng Vẽ / Phòng Tranh / Quảng trường / Cả thành phố. Trên bản đồ 3D, thẻ của mỗi khu có nút "Tạo lớp <khu>".
- QR của lớp khu nào thì học sinh quét vào thẳng khu đó và chỉ ở khu đó (Xưởng Vẽ kèm Phòng Tranh để nộp tranh).
- Bấm vào mã QR → phóng to toàn màn hình kèm mã PIN; nút X (hoặc Esc / bấm ra ngoài) để thu nhỏ.

## Xoá lớp
- Tab Phòng: nút "Xoá" ở từng lớp trong bảng và "Xoá lớp này…" ở lớp đang mở (có bước xác nhận). Xoá luôn người chơi, điểm, tranh, word cloud.

## Supabase (BẮT BUỘC, 1 lần)
SQL Editor → dán toàn bộ `supabase/migration_v68_creative_zones.sql` → Run.

## Deploy
Bấm đúp `push_v68.bat`.
