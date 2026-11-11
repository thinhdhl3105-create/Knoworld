'use client';

// v40: Knoworld Museum — đảo bảo tàng nối Main City (Cầu Ký Ức) và Temple Isle.
// Game pixel đi tham quan (lib/museumGame.js), ảnh thật từ Supabase (lib/museum.js),
// nhiều người chơi thấy nhau qua Supabase Realtime (kênh 'kw-museum').
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CityPage from '../components/city/CityPage';
import { useAuth } from '../components/AuthProvider';
import { mountMuseum } from '@/lib/museumGame';
import {
  MUSEUM_ADMIN_EMAIL, loadMuseumPhotos, unlockLoveRoom, loadGuestbook, signGuestbook,
  loadMuseumProgress, saveMuseumProgress, flushMuseumProgress, loadLeaderboard,
} from '@/lib/museum';
import { connectRoom, templeIdentity } from '@/lib/templeOnline';
import './museum.css';

export default function MuseumPage() {
  const ref = useRef(null);
  const router = useRouter();
  const { user } = useAuth();
  const userRef = useRef(user);
  const roomRef = useRef(null);

  useEffect(() => { userRef.current = user; if (roomRef.current) roomRef.current.retrack(); }, [user]);

  useEffect(() => {
    if (!ref.current) return undefined;
    const from = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('from') : null;
    const me = () => templeIdentity(!!userRef.current);
    const stop = mountMuseum(ref.current, {
      from,
      load: loadMuseumProgress,
      save: saveMuseumProgress,
      flush: flushMuseumProgress,
      me,
      isAdmin: () => userRef.current?.email === MUSEUM_ADMIN_EMAIL,
      photos: loadMuseumPhotos,
      unlockLove: unlockLoveRoom,
      guestbook: { load: () => loadGuestbook(40), sign: signGuestbook },
      leaderboard: () => loadLeaderboard(10),
      onExit: (to) => router.push(to === 'temple' ? '/temple?from=museum' : '/?b=museum'),
      online: (handlers) => { roomRef.current = connectRoom('kw-museum', me, handlers); return roomRef.current; },
    });
    const onHide = () => flushMuseumProgress();
    window.addEventListener('pagehide', onHide);
    return () => { window.removeEventListener('pagehide', onHide); roomRef.current = null; stop(); };
  }, [router]);

  return (
    <CityPage
      place="museum"
      title="Knoworld Museum"
      subtitle="Cross the Memory Bridge from Main City and walk through the galleries with everyone who is here right now: the classes, the student programmes, the milestones and the photos taken along the way. Earn exploration points for every exhibit you see, and find the 10 ducks hiding around the island today."
    >
      <div className="kwmu" ref={ref} />
    </CityPage>
  );
}
