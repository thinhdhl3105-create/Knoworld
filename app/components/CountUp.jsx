'use client';

import { useEffect, useRef, useState } from 'react';

// v24: Số đếm chạy lên khi cuộn tới (chỉ chạy 1 lần).
export default function CountUp({ value = 0, duration = 1200, className = '' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof value !== 'number') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setShown(value); return; }
    const run = () => {
      if (started.current) { setShown(value); return; }
      started.current = true;
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / duration);
        const eased = 1 - Math.pow(1 - k, 3);
        setShown(Math.round(value * eased));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { run(); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);

  return <span ref={ref} className={`tabular-nums ${className}`}>{shown.toLocaleString('en-US')}</span>;
}
