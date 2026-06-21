# Hướng dẫn deploy Knoworld (Supabase + Vercel)

Project đã build sạch (Next.js 14.2.35, 9 route, không lỗi). Làm theo 3 phần sau.

## Phần 1 — Supabase (backend)
1. Vào https://supabase.com → **New project** (chọn region gần VN, đặt mật khẩu DB).
2. Mở **SQL Editor → New query**, dán toàn bộ nội dung file `supabase/schema.sql`, bấm **Run**.
   → Tạo bảng `profiles`, `content`, enum `content_kind`, RLS, bucket Storage `uploads`,
   trigger tự tạo profile, và vài dòng nội dung mẫu.
3. Vào **Project Settings → API**, copy 2 giá trị:
   - **Project URL**  → biến `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public**  → biến `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. (Tuỳ chọn) **Authentication → Providers → Email**: tắt "Confirm email" nếu muốn đăng nhập ngay không cần xác nhận.

## Phần 2 — Vercel (frontend + backend)
1. Đẩy thư mục `knoworld/` lên một repo GitHub (hoặc dùng nút Import của Vercel).
2. Vào https://vercel.com → **Add New → Project** → chọn repo.
   - Framework: **Next.js** (tự nhận), Root Directory: thư mục chứa `package.json`.
3. Mục **Environment Variables**, thêm 2 biến từ Phần 1:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = <anon public key>
   ```
4. Bấm **Deploy**. Xong sẽ có domain dạng `https://knoworld-xxxx.vercel.app`.

## Phần 3 — Nối Auth với domain
Quay lại Supabase → **Authentication → URL Configuration**:
- **Site URL**: dán domain Vercel.
- **Redirect URLs**: thêm domain Vercel (và `http://localhost:3000` để test cục bộ).

## Chạy thử cục bộ (tuỳ chọn)
```bash
cd knoworld
npm install
cp .env.local.example .env.local   # điền 2 biến
npm run dev    # http://localhost:3000
```

## Ghi chú
- Khi **chưa** cấu hình Supabase, các trang nội dung vẫn hiển thị dữ liệu mẫu (sample) nên web không bao giờ trống.
- Khi **đã** cấu hình: đăng ký tại `/login`, rồi đăng/sửa/xoá nội dung và upload ảnh tại `/upload`.
- RLS đã bật: ai cũng đọc nội dung đã publish; chỉ tác giả mới sửa/xoá bài của mình.
