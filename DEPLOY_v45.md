# DEPLOY v45 — Medisland: đăng nhập thẳng vào đảo nhóm, influencer, KPI bằng con số, bỏ gợi ý

## Có gì mới
- **Đăng nhập**: sinh viên chỉ nhập **MSSV + mã vào đảo** → tự vào đúng đảo của nhóm. Không còn danh sách lớp/nhóm/thành viên công khai. Chỉ tài khoản admin thấy nút ⚙ Quản trị.
- **Công cụ truyền thông** (Quản trị → Công cụ truyền thông): tự đặt tên & thông số cho công cụ mới (bỏ mẫu có sẵn); bật/tắt được cả 6 kênh mặc định.
- **Bỏ gợi ý**: bỏ mô tả ưu/nhược của từng kênh trong Bàn điều phối, bỏ câu hỏi gợi ý trong báo cáo, bỏ chú thích kiểu “mỗi nhóm thích một kiểu hình”, bỏ thông tin khán giả ở đài TV & biển quảng cáo, bỏ chi tiết insight trong brief.
- **KPI bằng con số cụ thể**: số người tiếp cận/tuần, số người biết đến, số người cân nhắc, số người có thiện cảm, số sản phẩm bán, doanh thu (triệu đ), chi phí/khách mới (đ).
- **Influencer**: 8 người (tên, lĩnh vực, số người theo dõi, phí/tuần). Nhóm chọn người hợp tác; tệp khán giả và độ tin cậy là ẩn — phải hỏi người dân (họ kể mình theo dõi ai) và xem báo cáo từng influencer để tự rút ra.

## Supabase (BẮT BUỘC)
1. Nếu chưa chạy: `supabase/migration_v44_medisland.sql`
2. Chạy tiếp: `supabase/migration_v45_medisland_login.sql`

## Deploy
```bat
git push
```
