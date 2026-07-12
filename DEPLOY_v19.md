# DEPLOY v19 — Import danh sách MSSV bằng file Excel (.xlsx)

Trang **Admin > Access** giờ nhận thêm file **Excel (.xlsx / .xls)**, và có nút
**tải file Excel mẫu** (cột `MSSV`, `Họ tên`) để điền rồi upload ngược lại —
không cần chuyển sang CSV nữa.

## Thay đổi
- `lib/studentSheet.js` (mới): `downloadStudentTemplate()` xuất file `.xlsx` mẫu;
  `parseStudentFile()` đọc `.xlsx/.xls` (SheetJS) hoặc `.csv/.txt`, tự nhận diện
  cột **MSSV** và **Họ tên** kể cả có/không có hàng tiêu đề, và bỏ dấu khi so khớp.
- `app/admin/access/page.js`: nút **Download Excel template (.xlsx)**, nút upload
  đổi thành **Upload Excel / CSV** (nhận `.xlsx,.xls,.csv,.txt`).
- `package.json`: thêm dependency `xlsx` (SheetJS). Import động nên chỉ tải khi dùng.

## Supabase
**Không cần chạy SQL.** Dữ liệu vẫn ghi vào bảng `approved_students` sẵn có (v18).

## Deploy lên Vercel (chạy trên MÁY CỦA BẠN — nơi có GitHub login)
```bash
cd knoworld
# nếu báo index.lock: del .git\index.lock   (Windows)  /  rm -f .git/index.lock (mac/linux)
npm install            # cài xlsx theo package.json
npm run build          # kiểm tra build sạch (khuyên chạy)
git add .
git commit -m "v19: import MSSV bằng Excel (.xlsx) + tải file mẫu"
git push               # Vercel tự build & deploy
```

## Kiểm tra sau khi lên
1. Vào **/admin/access** (đăng nhập admin).
2. Bấm **Download Excel template (.xlsx)** → mở file, điền MSSV + Họ tên.
3. Bấm **Upload Excel / CSV** → chọn file vừa điền → danh sách hiện thêm sinh viên,
   báo "Added / updated N student IDs".
