'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// v24: Nền sao chuyển động nhẹ theo chuột. Các "ngôi sao sáng" là concept thật
// của Knowledge Hub — rê chuột để xem tên, bấm để mở concept đó.
// Tôn trọng prefers-reduced-motion (đứng yên, không parallax).
export default function StarfieldHero({ concepts = [] }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const router = useRouter();
  const [hover, setHover] = useState(null); // { title, x, y }
  const starsRef = useRef({ bg: [], big: [] });
  const mouseRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Pseudo-random ổn định theo id để vị trí concept không nhảy mỗi lần tải.
    const seeded = (str, salt) => {
      let x = 2166136261 ^ Math.imul(salt, 0x9e3779b1);
      for (const ch of `${salt}:${str}`) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
      // final avalanche (murmur3 fmix) to decorrelate x/y
      x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16;
      return ((x >>> 0) % 10000) / 10000;
    };

    const build = () => {
      const rect = wrap.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((w * h) / 5200);
      starsRef.current.bg = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.1 + 0.2,
        z: Math.random() * 0.8 + 0.2, // độ sâu → parallax
        tw: Math.random() * Math.PI * 2,
      }));
      // Concept stars: dồn về nửa phải trên desktop (bên trái là chữ).
      const wide = w > 900;
      const picks = concepts.slice(0, wide ? 22 : 10);
      starsRef.current.big = picks.map((c, i) => {
        const fx = seeded(c.id ?? i, 1);
        const fy = seeded(c.id ?? i, 2);
        return {
          id: c.id,
          title: c.title,
          x: wide ? w * (0.52 + fx * 0.44) : w * (0.08 + fx * 0.84),
          y: wide ? h * (0.1 + fy * 0.8) : h * (0.55 + fy * 0.4),
          r: 2.2 + seeded(c.id ?? i, 3) * 2.2,
          z: 0.6 + seeded(c.id ?? i, 4) * 0.6,
          tw: fx * 6,
        };
      });
    };

    const draw = (t) => {
      const m = mouseRef.current;
      m.x += (m.tx - m.x) * 0.06;
      m.y += (m.ty - m.y) * 0.06;
      ctx.clearRect(0, 0, w, h);
      const { bg, big } = starsRef.current;
      bg.forEach((s) => {
        const a = reduce ? 0.6 : 0.35 + 0.35 * Math.sin(t / 900 + s.tw);
        ctx.fillStyle = `rgba(229,224,237,${a * s.z})`;
        ctx.beginPath();
        ctx.arc(s.x + m.x * s.z * 14, s.y + m.y * s.z * 14, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      // Đường nối mảnh giữa các concept gần nhau → cảm giác "chòm sao".
      ctx.lineWidth = 0.6;
      for (let i = 0; i < big.length; i++) {
        for (let j = i + 1; j < big.length; j++) {
          const a = big[i];
          const b = big[j];
          const ax = a.x + m.x * a.z * 24; const ay = a.y + m.y * a.z * 24;
          const bx = b.x + m.x * b.z * 24; const by = b.y + m.y * b.z * 24;
          const d = Math.hypot(ax - bx, ay - by);
          if (d < 130) {
            ctx.strokeStyle = `rgba(198,191,255,${0.18 * (1 - d / 130)})`;
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
          }
        }
      }
      big.forEach((s) => {
        const x = s.x + m.x * s.z * 24;
        const y = s.y + m.y * s.z * 24;
        s.sx = x; s.sy = y;
        const pulse = reduce ? 1 : 1 + 0.25 * Math.sin(t / 700 + s.tw);
        const g = ctx.createRadialGradient(x, y, 0, x, y, s.r * 6 * pulse);
        g.addColorStop(0, 'rgba(198,191,255,0.55)');
        g.addColorStop(1, 'rgba(198,191,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, s.r * 6 * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = s.hot ? '#f6bd56' : '#efeaff';
        ctx.beginPath(); ctx.arc(x, y, s.r * (s.hot ? 1.5 : 1), 0, Math.PI * 2); ctx.fill();
      });
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    build();
    raf = requestAnimationFrame(draw);

    const onResize = () => { build(); if (reduce) requestAnimationFrame(draw); };
    const onMove = (e) => {
      const rect = wrap.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      if (!reduce) {
        mouseRef.current.tx = (mx / rect.width - 0.5) * 2;
        mouseRef.current.ty = (my / rect.height - 0.5) * 2;
      }
      let found = null;
      starsRef.current.big.forEach((s) => {
        s.hot = false;
        if (s.sx != null && Math.hypot(s.sx - mx, s.sy - my) < 16) found = s;
      });
      if (found) {
        found.hot = true;
        setHover({ id: found.id, title: found.title, x: found.sx, y: found.sy });
        wrap.style.cursor = 'pointer';
      } else {
        setHover(null);
        wrap.style.cursor = '';
      }
      if (reduce) requestAnimationFrame(draw);
    };
    window.addEventListener('resize', onResize);
    wrap.addEventListener('mousemove', onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      wrap.removeEventListener('mousemove', onMove);
    };
  }, [concepts]);

  const onClick = () => {
    if (hover?.id) router.push(`/knowledge-hub?c=${hover.id}`);
  };

  return (
    <div ref={wrapRef} className="absolute inset-0" onClick={onClick} aria-hidden={!concepts.length}>
      <canvas ref={canvasRef} className="absolute inset-0" />
      {hover && (
        <div
          className="absolute z-10 pointer-events-none -translate-x-1/2 -translate-y-full glass-card rounded-full px-3 py-1 text-xs font-bold text-on-surface whitespace-nowrap"
          style={{ left: hover.x, top: hover.y - 14 }}
        >
          <span className="material-symbols-outlined text-secondary text-sm align-[-3px] mr-1">hub</span>
          {hover.title}
        </div>
      )}
    </div>
  );
}
