# DEPLOY v47 — Medisland: brief theo môn học, bảng giá công cụ, thêm khách hàng & sản phẩm

## Có gì mới
- **Bảng giá công cụ (Quản trị → Công cụ truyền thông)**: sửa giá mọi công cụ (kể cả công cụ tự thêm). Mỗi công cụ chọn **Cố định** hoặc **Khoảng giá** (giá thầu — mỗi tuần một mức trong khoảng). Mặc định: TV, OOH, Activation cố định; Social, Search khoảng giá. Sửa được phí từng influencer. Giá được "chụp lại" lúc nhóm soạn kế hoạch nên đổi giá không làm thay đổi kết quả tuần đã chạy.
- **Thiết lập brief theo lớp (Quản trị → Lớp & agency)**: chọn tên môn học, mục tiêu chiến dịch (Theo brief gốc / Nhận biết / Tương tác / Thu lead / Doanh số) và độ khó (Dễ/Vừa/Khó). Hệ thống tự đổi bộ 5 KPI và câu mục tiêu trong brief; bối cảnh nhãn hàng giữ nguyên.
- **Thêm 2 nhóm khách hàng**: Người thu nhập cao (90.000) và Công nhân & lao động tự do (210.000) — có cư dân để phỏng vấn, gu hình ảnh và kênh riêng.
- **Thêm 5 nhãn hàng**: Mì Ba Miền (mì ly, ngân sách 900 tr), EcoRide (xe máy điện 18 tr, 2.400 tr), Sky Garden (căn hộ 2,6 tỷ, 4.000 tr), AnTâm Care (bảo hiểm 9 tr/năm, 2.000 tr), Vivu Resort (gói nghỉ dưỡng 6,5 tr, 1.800 tr). Hàng đắt: khách cân nhắc nhiều tuần, nhóm thu nhập thấp khó chốt mua, cần lead/tư vấn.
- Báo cáo có thêm **Lead**, **Lượt tương tác** và **giá thực tế** theo kênh; thêm 3 influencer mới.

## Supabase (BẮT BUỘC, theo thứ tự — file nào đã chạy thì bỏ qua)
1. `supabase/migration_v44_medisland.sql`
2. `supabase/migration_v45_medisland_login.sql`
3. `supabase/migration_v46_medisland_members.sql`
4. `supabase/migration_v47_medisland_brief.sql`

## Deploy
```bat
git push
```
