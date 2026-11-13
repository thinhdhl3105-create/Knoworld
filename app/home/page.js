'use client';

// v51: My Home — nhà của Thịnh (thay cho Knoworld Museum). Nối Main City bằng cầu, sang Temple Isle.
// Game pixel (lib/homeGame.js), dữ liệu Supabase (lib/home.js), mọi người thấy nhau qua kênh 'kw-home'.
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CityPage from '../components/city/CityPage';
import { useAuth } from '../components/AuthProvider';
import { mountHome } from '@/lib/homeGame';
import {
  HOME_ADMIN_EMAIL, loadHome, saveHomeLayout, knockHome, setHomeCode, loadHomeAccess, setHouseMode,
  addHomeGuest, removeHomeGuest, answerHomeKnock, uploadHomePhoto, removeHomeFiles, cleanupOldMuseumPhotos,
  loadDuckProgress, saveDuckProgress,
} from '@/lib/home';
import { connectRoom, templeIdentity } from '@/lib/templeOnline';
import './home.css';

export default function HomePage() {
  const ref = useRef(null);
  const router = useRouter();
  const { user } = useAuth();
  const userRef = useRef(user);
  const gameRef = useRef(null);

  useEffect(() => { userRef.current = user; if (gameRef.current) gameRef.current.refresh(); }, [user]);

  useEffect(() => {
    if (!ref.current) return undefined;
    const q = new URLSearchParams(window.location.search);
    const code = q.get('code');
    if (code) { setHomeCode(code); q.delete('code'); window.history.replaceState(null, '', window.location.pathname + (q.toString() ? `?${q}` : '')); }
    const isAdmin = () => userRef.current?.email === HOME_ADMIN_EMAIL;
    const me = () => templeIdentity(isAdmin());
    const stop = mountHome(ref.current, {
      from: q.get('from'),
      isAdmin,
      me,
      load: () => loadHome(isAdmin()),
      saveLayout: saveHomeLayout,
      upload: uploadHomePhoto,
      removeFiles: removeHomeFiles,
      admin: {
        load: loadHomeAccess, setMode: setHouseMode, addGuest: (n) => addHomeGuest(n), removeGuest: removeHomeGuest,
        answerKnock: answerHomeKnock, cleanupMuseum: cleanupOldMuseumPhotos,
      },
      knock: knockHome,
      setCode: setHomeCode,
      loadDucks: loadDuckProgress,
      saveDucks: saveDuckProgress,
      onExit: (to) => router.push(to === 'temple' ? '/temple?from=museum' : '/?b=museum'),
      online: (handlers) => connectRoom('kw-home', me, handlers),
    });
    gameRef.current = stop;
    return () => { gameRef.current = null; stop(); };
  }, [router]);

  return (
    <CityPage
      place="museum"
      title="My Home"
      subtitle="Thinh's home on the island between Main City and Temple Isle: the living room, the achievements room, the photo room and more. Knock on the door if it is locked, and find the 10 ducks hiding around the house today."
    >
      <div className="kwhome" ref={ref} />
    </CityPage>
  );
}
