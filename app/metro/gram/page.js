'use client';

// v52: MetroGram — mạng xã hội dưới ga B1 Main City Central (môn Social Media Marketing).
// Trò chơi chạy trong iframe /metrogram/game.html (cùng domain); dữ liệu qua window.__kwGram (lib/metrogram.js).
// Mỗi nhóm đăng 1 hook / ngày theo guideline thương hiệu; khách đi tàu + người dùng Knoworld tương tác.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import CityPage from '../../components/city/CityPage';
import { useAuth } from '../../components/AuthProvider';
import { createGramApi } from '@/lib/metrogram';
import './gram.css';

export default function MetroGramPage() {
  const router = useRouter();
  const { user } = useAuth();
  const userRef = useRef(user);
  const frameRef = useRef(null);
  const [full, setFull] = useState(false);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => {
    window.__kwGram = createGramApi({ getUser: () => userRef.current, onExit: () => router.push('/') });
    return () => { try { delete window.__kwGram; } catch { window.__kwGram = undefined; } };
  }, [router]);
  useEffect(() => {
    if (!full) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && e.shiftKey) setFull(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [full]);

  return (
    <CityPage
      place="metrogram"
      title="MetroGram"
      subtitle="The social network under Main City Central (B1). Each Social Media Marketing group posts one hook a day for its brand, following the brand guideline. Commuters on the platform react by segment: the right audience counts most. Knoworld members and guests can like and share today's hooks on the feed."
    >
      <div className={`kwmg${full ? ' full' : ''}`}>
        <div className="kwmg-bar">
          <span>Click vào khung để điều khiển · ← ↑ ↓ → / WASD · E để mở quầy</span>
          <button type="button" onClick={() => { setFull((f) => !f); setTimeout(() => frameRef.current?.focus(), 50); }}>{full ? 'Thu nhỏ' : 'Toàn màn hình'}</button>
        </div>
        <iframe ref={frameRef} src="/metrogram/game.html" title="MetroGram" className="kwmg-frame" />
      </div>
    </CityPage>
  );
}
