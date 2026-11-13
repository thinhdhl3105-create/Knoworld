'use client';

// v44: Medisland — đảo mô phỏng chiến dịch truyền thông cho môn Media Strategy & Tactics.
// Game pixel chạy trong iframe /medisland/game.html (cùng domain); dữ liệu qua window.__kwMedis (lib/medisland.js).
// Mỗi agency (nhóm) một hòn đảo riêng, đăng nhập bằng MSSV + mã vào đảo do giảng viên phát.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import CityPage from '../components/city/CityPage';
import { useAuth } from '../components/AuthProvider';
import { createMedisApi } from '@/lib/medisland';
import './medisland.css';

export default function MedislandPage() {
  const router = useRouter();
  const { user } = useAuth();
  const userRef = useRef(user);
  const frameRef = useRef(null);
  const [full, setFull] = useState(false);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => {
    window.__kwMedis = createMedisApi({ getUser: () => userRef.current, onExit: () => router.push('/?b=medisland') });
    return () => { try { delete window.__kwMedis; } catch { window.__kwMedis = undefined; } };
  }, [router]);
  useEffect(() => {
    if (!full) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && e.shiftKey) setFull(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [full]);

  return (
    <CityPage
      place="medisland"
      title="Medisland"
      subtitle="The media island for Media Strategy & Tactics. Every agency (student group) gets its own island and a brand to grow: meet the client, walk the four districts to watch and talk to customers, test ad designs on them, then vote and lock a weekly media plan in your office. Each run lasts exactly 48 real hours before the report comes in."
    >
      <div className={`kwmd${full ? ' full' : ''}`}>
        <div className="kwmd-bar">
          <span>Click vào khung game để điều khiển · ← ↑ ↓ → / WASD · Space để tương tác</span>
          <button type="button" onClick={() => { setFull((f) => !f); setTimeout(() => frameRef.current?.focus(), 50); }}>{full ? 'Thu nhỏ' : 'Toàn màn hình'}</button>
        </div>
        <iframe ref={frameRef} src="/medisland/game.html" title="Medisland" className="kwmd-frame" allow="autoplay" />
      </div>
    </CityPage>
  );
}
