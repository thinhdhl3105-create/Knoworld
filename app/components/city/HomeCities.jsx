'use client';

// v65: Màn hình chính có 2 thành phố cạnh nhau: Knoworld City (3D) và Creative City.
//   • Chuyển qua lại: nút gạt ở giữa dưới, máy bay kéo băng rôn "Creative City" bay ngang trời (bấm để bay sang),
//     vuốt từ mép phải màn hình (điện thoại), vuốt ngang 2 ngón trên touchpad (máy tính).
//   • Đang ở Creative City: vuốt sang phải hoặc bấm "Knoworld City" để quay về.
//   • Link thẳng: /?city=creative
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import KnoworldCity from './KnoworldCity';
import { useAuth } from '../AuthProvider';
import { Skyline } from '@/app/creative/ui';
import { CC_ADMIN_EMAIL, CC_STATIONS, normRoom } from '@/lib/creative';
import '@/app/creative/creative.css';
import './homecities.css';

function Plane({ size = 64 }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 100 60" aria-hidden="true">
      <path d="M8 30 Q40 22 82 26 Q96 28 96 31 Q96 34 82 35 Q40 38 8 31Z" fill="#ece9f5" />
      <path d="M44 27 L30 6 L40 6 L62 27Z" fill="#c6bfff" />
      <path d="M44 34 L30 55 L40 55 L62 34Z" fill="#a99ff5" />
      <path d="M10 30 L4 16 L12 16 L20 28Z" fill="#ff8fb1" />
      <circle cx="84" cy="30" r="2.4" fill="#7ee8ff" /><circle cx="76" cy="30" r="2" fill="#7ee8ff" opacity=".8" /><circle cx="68" cy="30" r="2" fill="#7ee8ff" opacity=".6" />
    </svg>
  );
}

export default function HomeCities() {
  const [city, setCity] = useState('knoworld');
  const [transit, setTransit] = useState(0); // tăng mỗi lần chuyển -> máy bay bay qua màn hình
  const touch = useRef(null);
  const wheel = useRef({ x: 0, t: 0 });

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('city') === 'creative') setCity('creative');
  }, []);

  const go = useCallback((c) => {
    setCity((cur) => {
      if (cur === c) return cur;
      setTransit((n) => n + 1);
      try { window.history.replaceState(null, '', c === 'creative' ? '/?city=creative' : '/'); } catch { /* ignore */ }
      return c;
    });
  }, []);

  // Vuốt: từ mép phải sang trái -> Creative City; ở Creative City vuốt sang phải -> về Knoworld City.
  const onTouchStart = (e) => {
    const t = e.touches[0]; if (!t || e.touches.length > 1) { touch.current = null; return; }
    const w = window.innerWidth;
    const fromEdge = city === 'knoworld' ? t.clientX > w - 28 : true;
    touch.current = fromEdge ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e) => {
    const s = touch.current; touch.current = null; if (!s) return;
    const t = e.changedTouches[0]; const dx = t.clientX - s.x; const dy = t.clientY - s.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (city === 'knoworld' && dx < 0) go('creative');
    if (city === 'creative' && dx > 0) go('knoworld');
  };
  // Touchpad vuốt ngang 2 ngón (deltaX); cuộn dọc / zoom của thành phố 3D không bị ảnh hưởng.
  const onWheel = (e) => {
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY) * 2) return;
    const now = Date.now(); const w = wheel.current;
    if (now - w.t > 400) w.x = 0;
    w.t = now; w.x += e.deltaX;
    if (w.x > 160 && city === 'knoworld') { w.x = -9999; go('creative'); }
    if (w.x < -160 && city === 'creative') { w.x = 9999; go('knoworld'); }
  };

  return (
    <section className="kwh" data-city={city} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onWheel={onWheel}>
      <h1 className="sr-only">Knoworld — explore knowledge like a living city</h1>
      <div className="kwh-track">
        <div className="kwh-pane" aria-hidden={city !== 'knoworld'} inert={city !== 'knoworld' ? '' : undefined}>
          <KnoworldCity underNav board className="h-full" />
        </div>
        <div className="kwh-pane" aria-hidden={city !== 'creative'} inert={city !== 'creative' ? '' : undefined}>
          <CreativePane active={city === 'creative'} onBack={() => go('knoworld')} />
        </div>
      </div>

      {/* Máy bay kéo băng rôn bay ngang trời Knoworld City — bấm để bay sang Creative City */}
      {city === 'knoworld' && (
        <button type="button" className="kwh-banner-plane" onClick={() => go('creative')} aria-label="Bay sang Creative City">
          <span className="kwh-rope" aria-hidden="true" />
          <span className="kwh-flag">CREATIVE CITY ›</span>
          <Plane size={58} />
        </button>
      )}

      {/* Máy bay chở bạn qua khi chuyển thành phố */}
      {transit > 0 && <div key={transit} className={`kwh-transit ${city === 'creative' ? 'to-r' : 'to-l'}`} aria-hidden="true"><Plane size={150} /></div>}

      <div className="kwh-switch" role="tablist" aria-label="Chọn thành phố">
        <button type="button" role="tab" aria-selected={city === 'knoworld'} className={city === 'knoworld' ? 'on' : ''} onClick={() => go('knoworld')}>
          <span className="kwh-dot" style={{ background: '#c6bfff' }} />Knoworld City
        </button>
        <button type="button" role="tab" aria-selected={city === 'creative'} className={city === 'creative' ? 'on' : ''} onClick={() => go('creative')}>
          <span className="material-symbols-outlined">flight</span>Creative City
        </button>
      </div>
    </section>
  );
}

function CreativePane({ active, onBack }) {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = (user?.email || '').toLowerCase() === CC_ADMIN_EMAIL;
  const [pin, setPin] = useState('');
  const join = (e) => {
    e.preventDefault();
    const r = normRoom(pin);
    router.push(r ? `/creative?r=${encodeURIComponent(r)}` : '/creative');
  };
  return (
    <div className="cc kwh-cc">
      <div className="cc-stars" />
      <div className="kwh-cc-glow" />
      {active && <div className="kwh-loop" aria-hidden="true"><Plane size={46} /></div>}
      <div className="kwh-cc-body">
        <button type="button" className="cc-pill kwh-back" onClick={onBack}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>Knoworld City</button>
        <div className="cc-title kwh-cc-card">
          <span className="cc-label">Knoworld · Thành phố thứ hai</span>
          <h2 className="kwh-cc-h">Creative <em>City</em></h2>
          <p>Thành phố sáng tạo cho buổi dạy thử và workshop: đoán ảnh, vẽ thương hiệu, tường tranh, word cloud. Không cần tài khoản.</p>
          <form onSubmit={join} className="kwh-pin">
            <input className="cc-input" value={pin} onChange={(e) => setPin(e.target.value.toUpperCase())} placeholder="Nhập mã PIN của lớp" aria-label="Mã PIN của lớp" inputMode="text" autoComplete="off" />
            <button type="submit" className="cc-btn">Vào lớp</button>
          </form>
          {isAdmin && (
            <div className="kwh-admin">
              <span className="cc-label">Giáo viên</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link href="/creative/host?new=1" className="cc-btn gold"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>Tạo lớp mới</Link>
                <Link href="/creative/host" className="cc-btn ghost"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>cast</span>Mở màn chiếu</Link>
              </div>
            </div>
          )}
          <div className="kwh-stations">
            {CC_STATIONS.slice(1).map((s) => <span key={s.id} className="cc-chip"><span className="cc-dot" style={{ background: s.color }} />{s.full}</span>)}
          </div>
        </div>
      </div>
      <div className="kwh-cc-sky"><Skyline /></div>
    </div>
  );
}
