# DEPLOY v60 — Lumi ghé ngang (bay mây / đi bộ) + nút Gọi Lumi

## Thay đổi
- Bỏ kiểu lấp ló 4 góc (hay bị mép màn hình / thanh menu che). Giờ Lumi hiện **trọn người** ở chỗ trống:
  - **Bay mây**: Lumi ngồi trên đám mây bay ngang qua màn hình ngay dưới thanh menu, nói 1 câu, rồi "bụp" tan mất.
  - **Đi bộ**: Lumi lạch bạch đi vào từ mép trái/phải ở phía dưới (trên nút Rate us và thanh menu dưới trên điện thoại),
    dừng lại vẫy tay + nói, rồi thụt xuống biến mất.
  - Mỗi lần chỉ khoảng **5 giây**. Rê chuột vào Lumi thì Lumi đứng chờ; bấm vào thì Lumi nhảy + nói thêm.
- **Nút "Gọi Lumi"**: tab nhỏ dính mép phải màn hình (rê chuột vào sẽ trượt ra chữ "Gọi Lumi"). Bấm là Lumi ra ngay,
  kể cả khi đã tắt Lumi tự ghé ngang.
- Các khoảnh khắc tự xuất hiện giữ như v59 (chào ngày mới, vào khu, ngồi im lâu, cuộn cuối trang, huy hiệu, ghé ngẫu nhiên),
  cách nhau ≥ 50 giây, tối đa 8 lần/phiên. Bấm vào Lumi có nút Tắt/Bật Lumi tự ghé ngang.
- Lumi đi dạo trong city 3D giữ nguyên.

## Supabase
Không cần chạy SQL.

## Deploy
Bấm đúp `push_v60.bat`.
