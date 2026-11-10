# DEPLOY v30 — Đường phố có xe & người + Thinh's Island

## Có gì mới
**Đường phố sống động (mọi trang con)**
- Ô tô, xe buýt, xe máy chạy hai chiều trên con đường trước các tòa nhà; người đi bộ trên vỉa hè.
- Tối/hoàng hôn: xe bật đèn pha. Máy bật "giảm chuyển động" thì xe đứng yên.

**Thinh's Island (chỉ admin thấy)**
- Trang mới `/island`: Today + Next up (đếm ngược), Lighthouse (ngày quan trọng, đếm ngày), Harbour board (lịch tuần 07:00–22:00).
- Thêm sự kiện: Teaching / Meeting / Important, lặp hằng tuần 5–10–15 buổi; xoá 1 buổi hoặc cả chuỗi từ buổi đó trở đi.
- Thành phố 3D: đảo mới có Lecture Hall, hải đăng quay đèn, nhà riêng, bến phà; phà chạy từ Profile City (biển Sea). Nút "Thinh's Island 🔒" trên thanh quận.
- Menu Admin có thêm "Thinh's Island".
- Notice Board của admin: tự hiện ngày quan trọng trong 7 ngày tới (nhãn Island · private). Người khác không thấy.

## Supabase (chạy trước khi dùng đảo)
Chạy `supabase/migration_v30_island.sql` trong SQL Editor. Bảng `private_events` chỉ email admin đọc/ghi được.

## Deploy
```bat
git add .
git commit -m "v30: xe co tren duong + Thinh's Island"
git push
```
