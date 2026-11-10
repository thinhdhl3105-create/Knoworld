'use client';

// v36: Knoworld Temple — đảo chùa nối Game Island bằng phà.
// Game pixel đi vòng quanh chùa: gõ mõ tích công đức, mua nhang ở quầy, xin xăm, hỏi Thầy Phán.
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CityPage from '../components/city/CityPage';
import { mountTemple } from '@/lib/templeGame';
import { loadTempleRemote, saveTempleRemote, flushTempleRemote } from '@/lib/temple';
import './temple.css';

export default function TemplePage() {
  const ref = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (!ref.current) return undefined;
    const stop = mountTemple(ref.current, {
      load: loadTempleRemote,
      save: saveTempleRemote,
      flush: flushTempleRemote,
      onExit: () => router.push('/games'),
    });
    const onHide = () => flushTempleRemote();
    window.addEventListener('pagehide', onHide);
    return () => { window.removeEventListener('pagehide', onHide); stop(); };
  }, [router]);

  return (
    <CityPage
      place="temple"
      title="Knoworld Temple"
      subtitle="Walk around the temple grounds: tap the wooden fish for merit, trade it for incense at the gate stall, then draw a fortune stick or ask Thầy Phán a question."
    >
      <div className="kwtp" ref={ref} />
    </CityPage>
  );
}
