# DEPLOY v58 — Hướng dẫn cư dân mới cùng Lumi

## Thay đổi
- **Lumi** — linh vật mới: chú đom đóm thắp đèn của Knoworld City (SVG tự vẽ, chớp mắt, vẫy tay, nhún nhảy, đổi biểu cảm).
- Ngay sau khi người mới bấm **Enter the city** ở cổng đăng ký (Resident Permit / Visitor Visa), Lumi nhảy ra chào:
  1. **Chọn lý do đến**: Media Strategy (→ Medisland), Social Media Marketing (→ MetroGram), E-Business (→ Case Studies), Chỉ muốn khám phá (→ Game Island).
  2. **Dạo phố**: làm sáng từng khu trên menu (Knowledge Hub, Case Studies, khu dành riêng cho bạn, Game Island, Temple, streak, tìm kiếm Ctrl+K).
     Khu bị gom vào "More"/☰ thì chỉ vào nút đó. Lumi nhảy theo từng thẻ.
  3. **Hộ chiếu tuần đầu** (góc trái dưới): 5 dấu tự đóng theo hoạt động thật — ghé Knowledge Hub, mở 1 Case Study,
     ghé Discussion hoặc thả tim, ghé Temple, quay lại ngày hôm sau. Đủ 5 dấu → pháo hoa + "Cư dân chính thức".
- **Bỏ qua hướng dẫn** có ở mọi bước; **Ẩn Lumi ✕** tắt riêng nhân vật. Hộ chiếu thu nhỏ / ẩn được.
- Trang **My Journey** có nút **Xem lại hướng dẫn cùng Lumi** (cũng gọi Lumi dậy nếu đã ẩn).
- Tour cũ 3 thẻ (v24) đã bỏ. Người đã đăng ký từ trước không bị làm phiền.
- File: `app/components/onboarding/Onboarding.jsx`, `onboarding.css`, `lib/onboarding.js`,
  sửa `EngagementLayer.jsx`, `VisitorGate.jsx`, `Nav.jsx` (gắn `data-tour`), `app/journey/page.js`.

## Supabase
Chạy `supabase/migration_v58_onboarding.sql` trong **SQL Editor** (an toàn khi chạy lại):
thêm cột `site_visitors.onboarding` + RPC `set_visitor_onboarding`.
Chưa chạy SQL thì web vẫn chạy bình thường — tiến độ chỉ lưu trong trình duyệt.

## Deploy
Bấm đúp `push_v58.bat`.
