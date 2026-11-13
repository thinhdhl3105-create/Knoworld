# DEPLOY v51 — Museum thành My Home

## Có gì mới
- Trang `/home` (My Home — nhà của Thịnh) thay cho `/museum` (link cũ `/museum` tự chuyển sang `/home`).
  - 6 phòng + sân trước, cầu về Main City, lối sang Temple Isle.
  - Chủ nhà (email admin) bấm **Trang trí**: ~40 món đồ, kéo thả, xoay, đổi màu, đổi sàn/tường/tên phòng. Tự lưu.
  - Khung ảnh, dây polaroid, giá vẽ, bàn album chứa ảnh; tủ cúp, bục, kệ treo, bằng khen chứa thành tích. Ảnh lưu bucket `home`.
  - **Ai được vào nhà**: khoá ở cửa chính — Mở cho mọi người / Thành viên Knoworld / Chỉ khách mời / Đóng cửa. Khách mời có mã riêng + link mời. Người lạ bấm chuông gõ cửa, chủ nhà Cho vào / Từ chối.
  - Người chưa được vào chỉ thấy mái nhà + sân trước; bố cục và ảnh trong nhà không được gửi xuống máy họ.
  - Giữ trò Tìm 10 em vịt (3 ngoài sân, 7 trong nhà). Mọi người thấy nhau (Realtime kênh `kw-home`).
- Bỏ Museum: Phòng Riêng + mật khẩu, sổ lưu bút, điểm khám phá, bảng xếp hạng, khách NPC. Ảnh cũ của Museum tự bị xoá khi admin mở `/home` lần đầu (không đụng poster Metro Ad Wall).
- Bản đồ thành phố: Museum Isle thành Home Isle, toà bảo tàng thành ngôi nhà mái đỏ.

## 1) Supabase
SQL Editor -> dán `supabase/migration_v51_home.sql` -> Run.

## 2) Deploy
Bấm đúp `push_v51.bat` (hoặc `git push`) -> Vercel tự build.
