# DEPLOY v26 — Knoworld City (trang chủ 3D)

## Có gì mới
- Trang chủ: phần đầu trang là thành phố 3D. Mỗi tòa nhà là một mục; bấm vào thì camera bay tới rồi mở trang đó.
- 3 thành phố nối bằng cầu: Main City (ai cũng thấy), Profile City (Profile, Upload, My Journey), Admin City (Dashboard, Visitors, Reviews, Concept Import) — Admin City chỉ hiện với tài khoản admin.
- Ngày/đêm theo giờ Việt Nam, mặt trời, mặt trăng đúng pha, sao, mây khối, mưa chiều mùa mưa (có nút Auto / Sunny / Rain).
- Chọn vùng đất: Sea / Desert / Mountains / Forest (trình duyệt nhớ lựa chọn).
- Bảng LED tòa News chạy tiêu đề tin thật từ bảng news_items.
- Trang /login: thành phố làm nền phía sau form. Cổng đăng ký (Student/Lecturer/Guest) trong suốt hơn để thấy thành phố.
- Thư viện mới: three@0.128.0 (tải riêng, chỉ khi cần).

## Supabase
Không có bảng mới. (Nếu chưa chạy v25 thì chạy `supabase/migration_v25_review_gate.sql`.)

## Deploy
```bat
git push
```
