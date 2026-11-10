'use client';

// v26: Knoworld City — the 3D home scene. three.js is loaded on demand (separate chunk).
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../AuthProvider';
import { fetchNews } from '@/lib/news';
import CityNoticeBoard from './CityNoticeBoard';
import './city.css';

const ADMIN_EMAIL = 'thinh.dhl3105@gmail.com';

// v27: underNav — the site menu floats over the city, so the city's own controls sit lower.
//      board — show the City Notice Board (home page).
export default function KnoworldCity({ mode = 'hero', className = '', underNav = false, board = false }) {
  const ref = useRef(null);
  const wrap = useRef(null);
  const api = useRef(null);
  const news = useRef([]);
  const router = useRouter();
  const { user, loading } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Real headlines for the News tower's LED ticker.
  useEffect(() => {
    let alive = true;
    fetchNews().then(({ data }) => {
      if (!alive) return;
      news.current = (data || []).map((n) => n.title).filter(Boolean);
      api.current?.setNews(news.current);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (loading) return undefined;
    let cancelled = false;
    import('./createCity').then(({ createCity }) => {
      if (cancelled || !ref.current) return;
      api.current = createCity(ref.current, {
        mode,
        isAdmin,
        news: news.current,
        onNavigate: mode === 'hero' ? (route) => router.push(route) : null,
      });
    });
    return () => {
      cancelled = true;
      api.current?.destroy();
      api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, isAdmin, loading]);

  const cls = `kwc ${mode === 'backdrop' ? 'kwc-backdrop' : ''} ${underNav ? 'kwc-under-nav' : ''}`;
  if (!board) return <div ref={ref} className={`${cls} ${className}`} />;
  return (
    <div ref={wrap} className={`kwc-wrap ${underNav ? 'kwc-under-nav' : ''} ${className}`}>
      <div ref={ref} className={`${cls} absolute inset-0`} />
      {!loading && <CityNoticeBoard isAdmin={isAdmin} user={user} anchorRef={wrap} />}
    </div>
  );
}
