# DEPLOY v62 — Lumi cưỡi mây bay PHÍA SAU thành phố

## Thay đổi
- Lumi bay ngang giờ được vẽ trên **lớp bầu trời** (nằm sau thành phố 3D), ngồi trên một khối mây voxel giống mây của thành phố:
  toà nhà luôn che Lumi, Lumi không bao giờ che thành phố.
- Bay vui: nhanh hơn mây thường, nhấp nhô, lắc lư, lâu lâu lộn một vòng, có vệt mây nhỏ bay theo; ban đêm ngôi sao trên đầu sáng lên,
  màu mây đổi theo trời. Thỉnh thoảng nói 1 câu trong bong bóng nhỏ (chào ngày mới, câu theo khu…).
- Tự bay ngang mỗi ~50–110 giây; trời mưa to thì không bay. Có ở Main City và phần bầu trời đầu các trang con.
- Ở Main City không còn Lumi nào bay/đi đè lên màn hình. Trang khác: khi đã cuộn qua bầu trời thì Lumi đi bộ ở mép dưới (~5 giây).
- Nút Lumi trên thanh menu + menu giữ như v61. "Tắt Lumi tự ghé ngang" tắt luôn Lumi bay trên trời.

## Supabase
Không cần chạy SQL.

## Deploy
Bấm đúp `push_v62.bat`.
