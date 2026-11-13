// v48: Knoworld Metro — 2 tầng hầm bên dưới Skyline (thành phố trên mặt đất).
// Đây là file cấu hình duy nhất cho tàu điện ngầm. Muốn gắn chức năng cho một ga:
//   - đặt `route` (vd. '/metro/main') -> nút "Open page" trên thẻ ga sẽ mở trang đó;
//   - sửa `desc` để mô tả chức năng.
// Ga chưa có route sẽ hiện "Function coming soon".
// v49→v50: các tầng xếp sát nhau (B1 -40, B2 -70) — từ Skyline vẫn thấy mép trước của B1, B2 bên dưới.
// Toạ độ [x, z] dùng chung hệ toạ độ với các đảo (Main City ở 0,0). Mọi ga phải nằm trên tuyến của nó.

export const METRO_LEVELS = [
  { id: 'b1', code: 'B1', name: 'Metro Concourse', y: -40, color: '#c6bfff',
    desc: 'The first underground level: Line 1 (Circle) runs under every public island, Line 2 (Harbour) goes west to Medisland.' },
  { id: 'b2', code: 'B2', name: 'Deep Express', y: -70, color: '#7ee8ff',
    desc: 'The deep level: Line 3 (Express) loops the whole city with four terminals, plus the train depot.' },
];

export const METRO_LINES = [
  { id: 'l1', level: 'b1', name: 'Line 1 · Circle', color: '#b388ff', loop: true, trains: 2,
    path: [[-10, -8], [64, -8], [64, 58], [20, 58], [20, 26], [-10, 26]] },
  { id: 'l2', level: 'b1', name: 'Line 2 · Harbour', color: '#ff8f6b', loop: false, trains: 1,
    path: [[-13, 16], [-31, 16], [-31, 52]],
    adminPath: [[-13, 16], [-31, 16], [-31, 57], [0, 57]] },
  { id: 'l3', level: 'b2', name: 'Line 3 · Express', color: '#4fd1c5', loop: true, trains: 2,
    path: [[-30, -22], [72, -22], [72, 70], [-30, 70]] },
];

export const METRO_STATIONS = [
  // ---- B1 · Line 1 (Circle)
  { id: 'b1-main', level: 'b1', line: 'l1', island: 'main', name: 'Main City Central', at: [6, -8], route: null, desc: '' },
  { id: 'b1-profile', level: 'b1', line: 'l1', island: 'profile', name: 'Profile City', at: [64, 6], route: null, desc: '' },
  { id: 'b1-games', level: 'b1', line: 'l1', island: 'games', name: 'Game Island', at: [52, 58], route: null, desc: '' },
  { id: 'b1-temple', level: 'b1', line: 'l1', island: 'temple', name: 'Temple Isle', at: [32, 58], route: null, desc: '' },
  { id: 'b1-museum', level: 'b1', line: 'l1', island: 'museum', name: 'Museum Isle', at: [20, 42], route: null, desc: '' },
  // ---- B1 · Line 2 (Harbour)
  { id: 'b1-west', level: 'b1', line: 'l2', island: 'main', name: 'Main City West', at: [-22, 16], route: null, desc: '' },
  { id: 'b1-medisland', level: 'b1', line: 'l2', island: 'medisland', name: 'Medisland', at: [-31, 40], route: null, desc: '' },
  { id: 'b1-admin', level: 'b1', line: 'l2', island: 'admin', name: 'Admin City', at: [-9, 57], route: null, desc: '', lock: true },
  // ---- B2 · Line 3 (Express)
  { id: 'b2-central', level: 'b2', line: 'l3', island: 'main', name: 'Central Grand Hall', at: [4, -22], route: null, desc: '' },
  { id: 'b2-east', level: 'b2', line: 'l3', island: 'profile', name: 'East Terminal', at: [72, 14], route: null, desc: '' },
  { id: 'b2-north', level: 'b2', line: 'l3', island: 'games', name: 'North Terminal', at: [44, 70], route: null, desc: '' },
  { id: 'b2-west', level: 'b2', line: 'l3', island: 'medisland', name: 'West Terminal', at: [-30, 46], route: null, desc: '' },
];

// Công trình ngầm không phải ga (cũng có thể gắn chức năng sau).
export const METRO_FACILITIES = [
  { id: 'b2-depot', level: 'b2', name: 'Train Depot', at: [26, 24], route: null, desc: '' },
];
