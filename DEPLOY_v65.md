# DEPLOY v65 — Creative City trên màn hình chính + tạo lớp kiểu Kahoot

## Màn hình chính: 2 thành phố
- Nút gạt **Knoworld City | Creative City** ở dưới màn hình. Bấm để bay sang thành phố kia, có máy bay bay ngang trong lúc chuyển.
- Máy bay kéo băng rôn **"CREATIVE CITY ›"** bay ngang trời Knoworld City; bấm vào để bay sang.
- Vuốt từ mép phải màn hình (điện thoại) hoặc vuốt ngang 2 ngón trên touchpad (máy tính). Ở Creative City vuốt ngược lại để về.
- Creative City trên màn hình chính có:
  - ô nhập mã PIN để vào lớp, và nút "Knoworld City" để quay về;
  - cho admin: nút **Tạo lớp mới** và **Mở màn chiếu**.
- Link thẳng tới Creative City: `/?city=creative`.

## Tạo lớp kiểu Kahoot
- **Tạo lớp mới** (trên màn hình chính, trang /creative, hoặc thanh trên màn chiếu): một chạm là có lớp với **mã PIN 6 số**, mở ngay sảnh chờ.
- Sảnh chờ có mã PIN cỡ lớn, mã QR và số học sinh đã vào. Nút **Bắt đầu** chuyển cả lớp sang Phòng Ảnh Lạ.
- Học sinh vào /creative (hoặc ô PIN ở màn hình chính) và nhập PIN + biệt danh.
- Nút quay về: trang học sinh có "Knoworld City"; màn chiếu có "Creative City" và "Knoworld City".

## Supabase
Không cần chạy SQL mới (dùng bảng của v64).

## Deploy
Bấm đúp `push_v65.bat`.
