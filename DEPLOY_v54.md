# DEPLOY v54 — Icon web app (khi cài Knoworld thành app)

## Lỗi
Tab trình duyệt đã hiện logo tòa nhà tím, nhưng khi cài thành web app thì icon lại là chữ **K**.
Nguyên nhân: web chỉ có `app/icon.svg` (favicon), không có manifest và không có icon PNG,
nên Chrome/Edge trên Windows tự vẽ chữ cái đầu.

## Đã sửa
- `app/manifest.js` → sinh `/manifest.webmanifest` (tên Knoworld, nền #0e0b1f, chế độ standalone).
- `public/icon-192.png`, `public/icon-512.png` (bo góc) và `public/icon-maskable-512.png` (cho Android).
- `app/apple-icon.png` (iPhone/iPad) và `app/favicon.ico` (Windows shortcut).
- `app/layout.js`: thêm `applicationName`, `appleWebApp`, `themeColor`.

## Supabase
Không cần SQL mới.

## Deploy
Bấm đúp `push_v54.bat`.

## Sau khi deploy
Icon đã cài sẽ KHÔNG tự đổi. Gỡ app cũ (chrome://apps → chuột phải Knoworld → Remove,
xóa shortcut ngoài Desktop), tải lại trang bằng Ctrl+F5, rồi cài lại.
