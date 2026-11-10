'use client';

// v27: Trang chủ chỉ còn thành phố — toàn màn hình, menu nổi phía trên,
// bảng thông báo thành phố (City Notice Board) nằm trong cảnh.
import KnoworldCity from './components/city/KnoworldCity';

export default function Home() {
  return (
    <section className="relative">
      <h1 className="sr-only">Knoworld — explore knowledge like a living city</h1>
      <KnoworldCity underNav board className="h-[calc(100svh-64px)] md:h-[100svh] min-h-[520px]" />
    </section>
  );
}
