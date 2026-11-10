// v28: Knowledge Hub kiểu bản đồ metro — mỗi nhóm (category) là một tuyến có màu riêng, ổn định theo tên.
const PALETTE = ['#a78bfa', '#f6bd56', '#4fd1c5', '#ff8a8a', '#7ec8ff', '#ff9bd2', '#b7f07e', '#ffb27a', '#c6bfff', '#5ee0a0'];

export function lineOf(category) {
  return (category && String(category).trim()) || 'Khác';
}

export function lineColor(category) {
  const name = lineOf(category);
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

// Đường đi kiểu metro: chéo 45° rồi thẳng.
export function metroPath(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const m = Math.min(Math.abs(dx), Math.abs(dy));
  const mx = a.x + Math.sign(dx) * m;
  const my = a.y + Math.sign(dy) * m;
  return `M${a.x},${a.y} L${mx},${my} L${b.x},${b.y}`;
}
