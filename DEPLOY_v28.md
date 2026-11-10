# DEPLOY v28 — Các trang con thành tòa nhà trong thành phố

## Có gì mới
**Khung chung cho mọi trang con**
- Đầu trang là bầu trời đổi theo giờ Việt Nam (sáng / trưa / chiều / hoàng hôn / đêm có sao) + hàng tòa nhà giả 3D, tòa của trang đó nổi bật.
- Thẻ tiêu đề: "Back to city" (bay về đúng tòa nhà đó trên trang chủ), đường dẫn Quận › Tòa nhà, giờ hiện tại.
- Nền phía dưới: thành phố phản chiếu, làm mờ. Các thẻ thành kính mờ. Menu trong suốt khi ở đầu trang, có nền khi cuộn xuống.
- Điện thoại: dùng mức mờ nhẹ hơn, thẻ không làm mờ nền để cuộn mượt.

**Từng trang**
- News → News Tower: bảng LED "ON AIR" chạy tiêu đề tin thật; nhãn thành các kênh có chấm màu.
- Knowledge Hub → bản đồ metro: mỗi nhóm concept là một tuyến màu, đường đi kiểu metro, ga đổi tuyến viền trắng, ga đang chọn có vòng vàng.
- Video Case Studies → rạp phim: bảng NOW SHOWING (video mới nhất, bấm xem ngay), mỗi nhóm là một "Hall", thẻ video có cuống vé.
- Student Case Studies → phòng triển lãm: tác phẩm đóng khung, bảng tên, đèn rọi; trang chi tiết có 3 cánh cửa Insight → Creative → Execution.
- Discussion → quảng trường: các câu hỏi ghim trên bảng gỗ.
- My Journey → nhà của bạn: lịch 12 tuần thành cửa sổ sáng đèn, 3 chặng thành 3 tầng nhà, huy hiệu thành tấm biển vàng.
- Các trang khác (Research, Dashboard, Profile, Upload, Search, Admin, Import) có khung chung với tòa nhà biển tên riêng.

## Supabase
Không có bảng mới. Tuỳ chọn: chạy `supabase/migration_v28_city_pages.sql` để đăng thông báo về giao diện mới lên City Notice Board (cần đã chạy v27).

## Deploy
```bat
git add .
git commit -m "v28: cac trang con thanh toa nha trong thanh pho"
git push
```
