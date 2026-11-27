'use client';

// v64: các thành phố đứng riêng (Creative City) không hiện menu, footer, Lumi, cổng visa,
// bảng đánh giá… của Knoworld City. Bọc các lớp chung trong layout bằng <SiteChrome>.
import { usePathname } from 'next/navigation';

const STANDALONE = ['/creative'];
export const isStandalonePath = (p) => STANDALONE.some((s) => p === s || (p || '').startsWith(`${s}/`));

export default function SiteChrome({ children }) {
  const pathname = usePathname() || '/';
  if (isStandalonePath(pathname)) return null;
  return children;
}
