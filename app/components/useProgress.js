'use client';

import { useEffect, useState } from 'react';
import { fetchMyProgress, computeStreak } from '@/lib/engagement';

// v24: Hook dùng chung — tiến độ của trình duyệt này + streak.
// Tự tải lại khi có sự kiện 'kw-progress' (xem case, mở concept, thả cảm xúc…).
export default function useProgress() {
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    let alive = true;
    let timer = null;
    const load = () => {
      fetchMyProgress().then((p) => { if (alive) setProgress(p); });
    };
    const debounced = () => { clearTimeout(timer); timer = setTimeout(load, 600); };
    load();
    window.addEventListener('kw-progress', debounced);
    return () => {
      alive = false;
      clearTimeout(timer);
      window.removeEventListener('kw-progress', debounced);
    };
  }, []);

  const streak = progress ? computeStreak(progress.days, progress.today) : { current: 0, best: 0, activeToday: false };
  return { progress, streak };
}
