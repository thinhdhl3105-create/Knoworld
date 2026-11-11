# DEPLOY v38 — Chùa mở rộng: khách thập phương, lạy Phật, luyện võ, quét lá đa

## Có gì mới
- **Chùa lớn gấp đôi** (bản đồ 46×40 ô, trước là 30×27): Chánh điện 3 tầng mái rộng 14 ô, **lầu chuông**, **lầu trống**, **bảo tháp 5 tầng**, đèn đá dọc sân, hồ sen dời sang phải. Quầy nhang và biển chỉ dẫn dời ra ngoài cổng tam quan.
- **Khách thập phương**: tối đa 9 người (ban đêm 3) đi từ bến phà vào cổng, lên chiếu đỏ **lạy 3 lạy**, thắp nhang ở lư hương, dạo hồ sen / bảo tháp / sân võ / cây đa rồi ra về. Bắt chuyện được (8 câu thoại). Khách đứng chắn đường thì giữ phím một chút là đi xuyên qua.
- **Lạy Phật**: đứng lên chiếu đỏ trước Chánh điện, bấm Space (điện thoại: A) → 3 lạy, mỗi lạy +2 công đức. Đứng ở chỗ khác trước điện thì chọn "Lạy Phật (3 lạy)" trong menu Chánh điện.
- **Sân luyện võ** (góc trái dưới): 3 chú tiểu đánh quyền, mộc nhân, giá binh khí. Hỏi **Võ sư** → minigame: bấm đúng chuỗi mũi tên (← Tả quyền, → Hữu quyền, ↑ Song phong, ↓ Tảo cước) trước khi hết giờ. 6 cấp: Nhập môn → Sơ cấp (5 bài) → Trung cấp (15) → Cao cấp (30) → Cao thủ (60) → Võ lâm cao thủ (100). Lên cấp thì bài dài hơn, mỗi bài thưởng nhiều công đức hơn. Cấp võ hiện trên thanh trên cùng.
- **Sân cây đa** (góc phải dưới): lá đa rơi liên tục. Lấy chổi ở **giá chổi**, đi qua đống lá là quét, mỗi đống +1 công đức.
- **Lầu chuông**: thỉnh chuông, mỗi ngày 1 lần +5 công đức. Lầu trống: đánh trống cho vui.
- Giới hạn công đức mỗi ngày tăng từ 200 lên **300** (gõ mõ + lạy + luyện võ + quét lá dùng chung).
- Người chơi cũ vào lại sẽ thấy lời chào "Chùa vừa được mở rộng"; công đức, đồ cúng cũ giữ nguyên.

## Supabase
Không cần chạy SQL mới (vẫn dùng cột `site_visitors.temple` từ v36; chỉ thêm vài trường nhỏ trong JSON: `vo`, `swept`, `bows`, `bell`).

## Deploy
```bat
git add .
git commit -m "v38: chua mo rong - khach thap phuong, lay Phat, san luyen vo, quet la da"
git push
```
