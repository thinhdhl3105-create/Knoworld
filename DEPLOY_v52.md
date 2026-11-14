# DEPLOY v52 — MetroGram tại ga B1 Main City Central

## Có gì mới
- Ga **B1 · Main City Central** có chức năng đầu tiên: **MetroGram** (`/metro/gram`), mạng xã hội của ga cho môn Social Media Marketing.
  Bấm vào ga trên bản đồ → "Open page".
- **Sinh viên**: tab "Vào nhóm" → MSSV + mã nhóm (giảng viên phát). Mỗi nhóm đăng **1 hook / ngày** (10–150 ký tự),
  tự gắn nhãn (1 giọng điệu, 1–2 kỹ thuật, thành phần thêm), chọn giờ lên sóng 07:00 / 12:00 / 20:00 / 23:00 (giờ đã qua thì không chọn được).
  - Nhãn kiểm tra được (con số, câu hỏi, emoji, CTA, ngôn ngữ Gen Z) mà hook không có → tự bị bỏ.
  - Khách đi tàu (6 nhóm khách) phản ứng theo tệp; số liệu tăng dần từ giờ lên sóng tới 24:00 rồi chốt.
  - Sinh viên chỉ thấy **tổng điểm ngày** (sau 24:00), không thấy trọng số và điểm giảng viên.
  - Muốn xem hook nhóm khác trên Bảng tin phải đăng hook nhóm mình trước.
- **Bảng tin**: ai vào web cũng thả tim / chia sẻ hook đang lên sóng (mỗi bài 1 lần). MSSV hợp lệ = thành viên, còn lại = khách. Không tự tương tác bài nhóm mình.
- **Giảng viên** (đăng nhập email admin) — tab 🎓 Giảng viên:
  - Tạo lớp (mã lớp, học kỳ, **ngày bắt đầu** = ngày 1, số ngày mặc định 7).
  - Thêm/sửa nhóm: mã nhóm, thương hiệu, ngành, thông điệp, chân dung khách hàng, **tệp mục tiêu**, **giọng điệu**, **từ cấm**, danh sách thành viên (mỗi dòng `MSSV - Họ tên`).
  - Soát hook theo ngày: bấm nhãn để đánh dấu nhãn sai (−10%), chấm **1–5 sao (ẩn, +10/sao)**, đưa hook lên **Ad Wall** của ga.
  - Thấy điểm tách riêng: khách tàu + website + GV = tổng.
- Trọng số: khách tàu ❤️ đúng tệp ×1 / ngoài ×0.2, 🔁 đúng tệp ×3 / ngoài ×0.5; website thành viên ❤️×2 🔁×4, khách ❤️×1 🔁×2;
  lỗi guideline −15% / nhãn sai −10% (trừ trên điểm tàu + web); sao GV không bị trừ.

## 1) Supabase
SQL Editor → New query → dán toàn bộ `supabase/migration_v52_metrogram.sql` → Run. (An toàn khi chạy lại.)

## 2) Deploy
Bấm đúp `push_v52.bat` (hoặc `git push`) → Vercel tự build.

## 3) Bắt đầu dùng
Vào `/metro/gram` bằng tài khoản admin → 🎓 Giảng viên → ＋ Lớp mới (đặt ngày bắt đầu) → ＋ Thêm nhóm → phát mã nhóm cho sinh viên.
