'use client';

// v27: Trang chủ chỉ còn thành phố — toàn màn hình, menu nổi phía trên.
// v65: hai thành phố cạnh nhau — Knoworld City ⇄ Creative City (nút gạt, máy bay, vuốt ngang).
import { Suspense } from 'react';
import HomeCities from './components/city/HomeCities';

export default function Home() {
  // v69: HomeCities đọc ?city=creative -> cần Suspense (Next 14)
  return <Suspense fallback={<div className="kwh" style={{ background: '#0b0a1a' }} />}><HomeCities /></Suspense>;
}
