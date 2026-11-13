'use client';

// v36: Knoworld Temple — đảo chùa nối Game Island bằng phà.
// Game pixel đi vòng quanh chùa: gõ mõ tích công đức, mua nhang ở quầy, xin xăm, hỏi Thầy Phán.
// v38: chùa mở rộng — khách thập phương, lạy Phật, sân luyện võ, quét lá đa.
// v39: nhiều người chơi — ai đang mở trang này đều thấy nhau (Supabase Realtime, lib/templeOnline.js).
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CityPage from '../components/city/CityPage';
import { useAuth } from '../components/AuthProvider';
import { mountTemple } from '@/lib/templeGame';
import { loadTempleRemote, saveTempleRemote, flushTempleRemote } from '@/lib/temple';
import { connectTempleRoom, templeIdentity } from '@/lib/templeOnline';
import './temple.css';

export default function TemplePage() {
  const ref = useRef(null);
  const router = useRouter();
  const { user } = useAuth();
  const userRef = useRef(user);
  const roomRef = useRef(null);

  // Đăng nhập admin xong (sau khi game đã chạy) -> cập nhật nhãn GV cho mọi người.
  useEffect(() => { userRef.current = user; if (roomRef.current) roomRef.current.retrack(); }, [user]);

  useEffect(() => {
    if (!ref.current) return undefined;
    const me = () => templeIdentity(!!userRef.current);
    const stop = mountTemple(ref.current, {
      load: loadTempleRemote,
      save: saveTempleRemote,
      flush: flushTempleRemote,
      onExit: () => router.push('/games'),
      onMuseum: () => router.push('/home?from=temple'), // v51: My Home
      me,
      online: (handlers) => { roomRef.current = connectTempleRoom(me, handlers); return roomRef.current; },
    });
    const onHide = () => flushTempleRemote();
    window.addEventListener('pagehide', onHide);
    return () => { window.removeEventListener('pagehide', onHide); roomRef.current = null; stop(); };
  }, [router]);

  return (
    <CityPage
      place="temple"
      title="Knoworld Temple"
      subtitle="Walk around the temple grounds with everyone who is here right now: bow before the main hall, tap the wooden fish, train kung fu with the master or sweep banyan leaves for merit, trade it for incense at the gate stall, then draw a fortune stick or ask Thầy Phán a question."
    >
      <div className="kwtp" ref={ref} />
    </CityPage>
  );
}
