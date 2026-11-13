'use client';

// v48: hiệu ứng hạt cho ngày lễ — cánh hoa, hoa mai, tuyết, giấy màu, pháo hoa.
import { useEffect, useRef } from 'react';

const rnd = (a, b) => a + Math.random() * (b - a);

export default function HolidayParticles({ kind = 'petals', colors = [], density = 1, className = '', style }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return undefined;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, raf = 0, alive = true, last = performance.now();
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    };
    size();
    const ro = new ResizeObserver(size); ro.observe(cv);
    const pal = colors.length ? colors : ['#ffffff'];
    const area = Math.max(0.35, (W * H) / (1440 * 860));
    const N = Math.round((kind === 'snow' ? 90 : kind === 'fireworks' ? 26 : 46) * density * area * (reduce ? 0.3 : 1));

    // ---- falling things
    const spawn = (anyY) => ({
      x: rnd(-20, W + 20), y: anyY ? rnd(-H, H) : rnd(-60, -10),
      vy: kind === 'snow' ? rnd(18, 46) : rnd(28, 70), vx: rnd(-12, 12),
      r: kind === 'snow' ? rnd(1.2, 3.4) : rnd(5, 10), rot: rnd(0, 6.28), vr: rnd(-2, 2),
      sway: rnd(0.6, 1.6), ph: rnd(0, 6.28), c: pal[(Math.random() * pal.length) | 0],
      mai: kind === 'blossom' && Math.random() < 0.45,
    });
    const flakes = kind === 'fireworks' ? [] : Array.from({ length: N }, () => spawn(true));
    // ---- fireworks
    const sparks = []; let boomT = 0.2;
    const golds = Array.from({ length: kind === 'fireworks' ? N : 0 }, () => ({ ...spawn(true), r: rnd(1, 2.2), c: pal[0], vy: rnd(14, 30) }));
    function boom() {
      const x = rnd(W * 0.1, W * 0.9), y = rnd(H * 0.08, H * 0.45), c = pal[(Math.random() * pal.length) | 0], n = reduce ? 26 : 64;
      const c2 = pal[(Math.random() * pal.length) | 0];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.283 + rnd(-0.05, 0.05), sp = rnd(70, 190);
        sparks.push({ x, y, px: x, py: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(1.1, 1.8), t: 0, c: i % 3 ? c : c2 });
      }
    }

    function petal(p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      if (p.mai) { // hoa mai 5 cánh
        ctx.fillStyle = '#ffd23f';
        for (let k = 0; k < 5; k++) { ctx.rotate(1.2566); ctx.beginPath(); ctx.ellipse(0, -p.r * 0.55, p.r * 0.38, p.r * 0.55, 0, 0, 6.283); ctx.fill(); }
        ctx.fillStyle = '#e07b00'; ctx.beginPath(); ctx.arc(0, 0, p.r * 0.2, 0, 6.283); ctx.fill();
      } else {
        ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(p.ph * 2)));
        ctx.fillStyle = p.c; ctx.beginPath();
        ctx.moveTo(0, -p.r); ctx.quadraticCurveTo(p.r * 0.9, -p.r * 0.2, 0, p.r); ctx.quadraticCurveTo(-p.r * 0.9, -p.r * 0.2, 0, -p.r); ctx.fill();
      }
      ctx.restore();
    }
    function confetti(p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.scale(Math.cos(p.ph * 3), 1); ctx.fillStyle = p.c; ctx.fillRect(-p.r * 0.5, -p.r * 0.25, p.r, p.r * 0.5); ctx.restore();
    }

    function frame(now) {
      if (!alive) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      for (const p of flakes) {
        p.ph += dt * p.sway; p.y += p.vy * dt; p.x += (p.vx + Math.sin(p.ph) * 22) * dt; p.rot += p.vr * dt;
        if (p.y > H + 20) Object.assign(p, spawn(false));
        if (kind === 'snow') { ctx.globalAlpha = 0.85; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
        else if (kind === 'confetti') { ctx.globalAlpha = 0.95; confetti(p); }
        else { ctx.globalAlpha = 0.9; petal(p); }
      }
      if (kind === 'fireworks') {
        boomT -= dt; if (boomT <= 0) { boom(); boomT = rnd(0.5, 1.3) / Math.max(0.4, density); }
        ctx.globalCompositeOperation = 'lighter';
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i]; s.t += dt;
          if (s.t > s.life) { sparks.splice(i, 1); continue; }
          s.px = s.x; s.py = s.y; s.vx *= 0.985; s.vy = s.vy * 0.985 + 60 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
          ctx.globalAlpha = 1 - s.t / s.life; ctx.strokeStyle = s.c; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(s.px, s.py); ctx.lineTo(s.x, s.y); ctx.stroke();
        }
        for (const g of golds) {
          g.y += g.vy * dt; g.ph += dt * 3; if (g.y > H + 10) Object.assign(g, { ...spawn(false), r: rnd(1, 2.2), c: pal[0], vy: rnd(14, 30) });
          ctx.globalAlpha = 0.5 + 0.5 * Math.sin(g.ph); ctx.fillStyle = g.c; ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, 6.283); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); };
  }, [kind, density, colors.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return <canvas ref={ref} className={className} style={{ pointerEvents: 'none', width: '100%', height: '100%', display: 'block', ...style }} aria-hidden="true" />;
}
