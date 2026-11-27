import './creative.css';

// v64: Creative City là thành phố riêng — không dùng menu, footer, Lumi hay cổng visa của Knoworld City
// (xem app/components/SiteChrome.jsx).
export const metadata = {
  title: 'Creative City — Knoworld',
  description: 'Thành phố sáng tạo cho buổi dạy thử: đoán ảnh, vẽ thương hiệu, tường tranh và word cloud.',
};

export const viewport = {
  themeColor: '#13121b',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function CreativeLayout({ children }) {
  return children;
}
