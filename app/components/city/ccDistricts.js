// v66: Creative City 3D — các khu chức năng (dùng chung cho cảnh 3D và thẻ thông tin).
// Trung tâm Sáng tạo ở giữa bao gồm toàn bộ hoạt động; 4 khu xung quanh ứng với 4 trạm của buổi học.
export const CC_DISTRICTS = [
  { id: 'hub', name: 'Trung tâm Sáng tạo', short: 'Trung tâm', color: '#ffd27a', icon: 'emoji_objects', cx: 0, cz: 0, size: 26,
    desc: 'Trái tim của Creative City, nơi gom mọi hoạt động của buổi học. Nhập mã PIN để vào lớp; giáo viên mở trạm nào, cả lớp được đưa tới khu đó.' },
  { id: 'guess', name: 'Phòng Ảnh Lạ', short: 'Ảnh Lạ', color: '#7ee8ff', icon: 'photo_camera', cx: -34, cz: -34, size: 30, station: 'guess',
    desc: 'Đoán vật thể qua ảnh chụp ở góc nhìn lạ, cắt thật sát. Chơi kiểu Kahoot: 4 đáp án, đếm ngược 20 giây, đúng và nhanh thì nhiều điểm.' },
  { id: 'draw', name: 'Xưởng Vẽ Thương Hiệu', short: 'Xưởng Vẽ', color: '#ff8fb1', icon: 'brush', cx: 34, cz: -34, size: 30, station: 'draw',
    desc: 'Mỗi bạn bốc một sản phẩm của thương hiệu Việt rồi vẽ lại theo cách của mình: vẽ trên giấy rồi chụp, hoặc vẽ ngay trên điện thoại.' },
  { id: 'wall', name: 'Phòng Tranh', short: 'Phòng Tranh', color: '#5ee0a0', icon: 'collections', cx: -34, cz: 34, size: 30, station: 'wall',
    desc: 'Tường tranh kiểu Pinterest: tải tranh lên, giáo viên duyệt là hiện. Lọc theo thương hiệu và thả tim cho tranh mình thích.' },
  { id: 'plaza', name: 'Quảng trường', short: 'Quảng trường', color: '#c6bfff', icon: 'cloud', cx: 34, cz: 34, size: 30, station: 'plaza',
    desc: 'Word cloud "Sáng tạo với em là…": mỗi bạn góp tối đa 3 từ, cả lớp cùng nhìn đám mây chữ lớn dần trên màn chiếu.' },
];
export const ccDistrict = (id) => CC_DISTRICTS.find((d) => d.id === id) || CC_DISTRICTS[0];
