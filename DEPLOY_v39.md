# DEPLOY v39 — Chùa nhiều người chơi

## Có gì mới
- Ai đang mở trang `/temple` cùng lúc đều **thấy nhau đi lại trong chùa** (theo thời gian thực).
- **Ký hiệu người chơi thật:** thẻ tên **viền xanh lá + chấm xanh** trên đầu. Khách thập phương và chú tiểu (NPC) không có thẻ tên. Giảng viên đang đăng nhập admin có thêm **nhãn vàng GV**.
- Tên hiển thị chỉ là **tên gọi** (chữ cuối của họ tên khi đăng ký cổng, vd "Thịnh"), không hiện họ tên đầy đủ. Chưa đăng ký thì hiện "Khách A1B2".
- Nhân vật của mỗi người lấy **màu da, màu tóc, màu bộ đồ** từ nhân vật cư dân (v33) của họ.
- Thấy được người khác: đang đi/chạy, cầm chổi, đang lạy Phật, đang luyện võ (đánh quyền tại chỗ), đang gõ mõ / mua nhang / xin xăm / hỏi Thầy Phán (hiện cạnh tên).
- **Nói nhanh:** nút **💬 Nói** (phím T) → chọn 1 trong 9 câu có sẵn, hiện bong bóng trên đầu cho mọi người thấy. Không có ô gõ chữ tự do (tránh spam / nói bậy). Giới hạn 1 câu / 2 giây.
- Đứng cạnh người chơi khác và bấm Space: chào, rủ lạy Phật, rủ ra sân võ.
- **Lạy chung:** đang lạy mà có người chơi khác cũng lạy → thưởng thêm **+3 công đức**.
- Thanh trên cùng có chip "● N người ở chùa" (bấm vào để xem tên).

## Supabase
Không cần chạy SQL: dùng **Supabase Realtime** (Presence + Broadcast) trên kênh `kw-temple`, không lưu gì vào database.
- Realtime mặc định đã bật. Nếu không thấy nhau: Supabase Dashboard → **Project Settings → Realtime** → kiểm tra **"Allow public access"** đang bật (tắt thì chỉ kênh private mới chạy).
- Gói Free: tối đa 200 kết nối realtime cùng lúc, 2 triệu tin nhắn / tháng — đủ cho lớp học (vị trí chỉ gửi khi nhân vật bước sang ô mới).
- Nếu Realtime lỗi, game tự chơi một mình như cũ (chip "người ở chùa" ẩn đi).

## Thử
Mở `/temple` ở 2 trình duyệt (hoặc 1 tab thường + 1 tab ẩn danh) → hai nhân vật thấy nhau.

## Deploy
```bat
git add .
git commit -m "v39: chua nhieu nguoi choi - thay nhau, the ten, noi nhanh, lay chung"
git push
```
