# Knoworld — Deploy v11 (Frameworks dạng Spiderweb)

## Có gì mới
- **Knowledge Hub → Frameworks → View steps**: thay khung 2 cột tĩnh bằng **bản đồ
  spiderweb radial**. Framework nằm ở **lõi trung tâm**, mỗi bước là một **node toả ra**,
  các sub-step là chấm vệ tinh quanh node đó. **Click node bước** → panel bên phải
  hiện mô tả bước + các sub-step.
- **Toggle view**: nút **Spiderweb / Danh sách** — đổi nhanh giữa bản đồ node và danh
  sách số thứ tự tuyến tính. Có **zoom (+/−), kéo để di chuyển, cuộn để zoom**, và
  thanh tiến độ theo bước.
- **Modal framework** được mở **to & đẹp hơn** (rộng hơn, gradient/glow, nút đóng tròn).
- Thêm thư viện **d3** vào dependencies (đã có trong package.json).

## Supabase — KHÔNG cần migration mới
Cấu trúc `steps`/`substeps` (jsonb) giữ nguyên từ v10.

## Đẩy lên Vercel (chạy trên MÁY BẠN, terminal Windows)
Commit đã được tạo sẵn trên nhánh `main` (id `5597141`). Chỉ cần push:

```powershell
cd "D:\Hồ Sơ\Knowledge App\Knowledge management\knoworld"
git push origin main
```

> Nếu git báo vướng file khoá (`index.lock` / `HEAD.lock`), xoá chúng rồi thử lại:
> ```powershell
> del .git\HEAD.lock .git\index.lock .git\objects\maintenance.lock
> git reset            # đồng bộ lại index cho sạch (không mất gì)
> git push origin main
> ```
Vercel đã nối repo nên push xong là **tự build & deploy**. Mở link Vercel để kiểm tra.

## Kiểm thử sau deploy
1. Knowledge Hub → tab **Frameworks** → thẻ **IMC Campaign** → **View steps**.
2. Thấy bản đồ spiderweb: lõi "IMC Campaign" ở giữa, 9 node bước toả ra.
3. Click một node → panel phải hiện mô tả + sub-steps; nhánh được chọn sáng lên.
4. Bấm **Danh sách** để xem dạng list; bấm **Spiderweb** để quay lại.
