# DEPLOY v46 — Medisland: giảng viên vào thẳng đảo, nhóm linh hoạt

## Có gì mới
- **Giảng viên vào thẳng đảo**: khung đăng nhập (với tài khoản admin) có chọn **Lớp → Nhóm → 🏝 Vào đảo nhóm này**, không cần MSSV/mã. Trong Quản trị, mỗi nhóm cũng có nút **🏝 Vào đảo**. Chế độ giảng viên chỉ xem (không soạn/đồng ý/chốt thay nhóm); sinh viên thấy giảng viên đi trên đảo.
- **Nhóm linh hoạt**: từ 1 người, không giới hạn. Nhóm 1 người tự chốt được (không cần ≥2 người trong văn phòng).
- **Thêm/bớt thành viên bất cứ lúc nào**: Quản trị → Chi tiết nhóm → “Cho rời nhóm” / “Cho quay lại” / thêm “Họ tên - MSSV”. Người rời nhóm giữ lịch sử đóng góp nhưng không đăng nhập được và không tính vào biểu quyết.

## Supabase (BẮT BUỘC, theo thứ tự)
1. `supabase/migration_v44_medisland.sql` (nếu chưa chạy)
2. `supabase/migration_v45_medisland_login.sql` (nếu chưa chạy)
3. `supabase/migration_v46_medisland_members.sql`

## Deploy
```bat
git push
```
