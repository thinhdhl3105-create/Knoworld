'use client';

// v26: Knoworld City — the 3D home scene. three.js is loaded on demand (separate chunk).
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../AuthProvider';
import { fetchNews } from '@/lib/news';
import './city.css';

const ADMIN_EMAIL = 'thinh.dhl3105@gmail.com';

export default function KnoworldCity({ mode = 'hero', className = '' }) {
  const ref = useRef(null);
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

  return <div ref={ref} className={`kwc ${mode === 'backdrop' ? 'kwc-backdrop' : ''} ${className}`} />;
}
