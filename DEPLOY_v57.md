# DEPLOY v57 — Card Student Case Study giống Image Case Study

## Thay đổi
- Trang **Student Case Studies** (`/students`): card đổi sang cùng kiểu với **Image Case Studies**:
  khung card bo góc, ảnh bìa 16:10 phủ kín, nút tim góc phải trên ảnh, số ảnh góc trái (nếu có nhiều ảnh),
  nhãn danh mục màu vàng (vd. IMC CAMPAIGN), tên dự án, dòng tác giả có icon nhóm.
- Bỏ kiểu "khung tranh + bảng tên" cũ. Phần Exhibit of the week, bộ lọc, tìm kiếm giữ nguyên.
- File: `app/students/page.js`.

## Supabase
Không cần chạy SQL — chỉ đổi giao diện, dữ liệu giữ nguyên.

## Deploy
Bấm đúp `push_v57.bat`.
