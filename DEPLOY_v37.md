# DEPLOY v37 — Harbour board: lịch dạy theo thứ, trường, nghỉ lớp & dạy bù

## Có gì mới (trang /island)
- **Repeat → "Every week on chosen days…"**: chọn các thứ (vd Mon + Wed), ngày bắt đầu (From) và ngày kết thúc (Until). Form hiện trước số buổi, vd "20 sessions · Mon 16 Nov → Wed 20 Jan". Tối đa 200 buổi/lần.
- **School** (chỉ hiện với Teaching): gõ hoặc chọn HSU / VLU / UEH / trường đã dùng. Hiện trên ô lịch, Today và ô chi tiết.
- **Cancel class**: bấm 1 buổi → Cancel class → (lý do tuỳ chọn) → buổi đó gạch ngang, mờ, không tính vào "Next up". Có thể tick **Schedule a make-up class** để chọn luôn ngày/giờ/phòng dạy bù.
- Buổi đã nghỉ: **Add make-up** (nếu chưa có buổi bù) hoặc **Restore class** (đi dạy lại).
- Buổi dạy bù có nhãn MAKE-UP, viền đứt, liên kết qua lại với buổi bị nghỉ.
- Chip "Cancelled classes" trên Harbour board để ẩn/hiện các buổi đã nghỉ.

## Supabase (chạy trước)
Chạy `supabase/migration_v37_island_teaching.sql` trong SQL Editor (thêm cột `school`, `status`, `cancel_reason`, `makeup_for` vào `private_events`). Chưa chạy thì trang hiện nhắc nhở; lặp theo thứ vẫn dùng được, nhưng School / nghỉ lớp / dạy bù sẽ báo cần chạy migration.

## Deploy
```bat
git add .
git commit -m "v37: Harbour board - lap theo thu tu ngay A den B, truong day, nghi lop va day bu"
git push
```
