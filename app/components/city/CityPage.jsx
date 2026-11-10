'use client';

// v28: Khung chung cho các trang con kiểu Knoworld City.
// - Đầu trang: bầu trời theo giờ Việt Nam + hàng tòa nhà 3D, tòa của trang này nổi bật.
// - Thẻ tiêu đề: ← Back to city (bay về đúng tòa nhà), đường dẫn quận › tòa nhà, giờ hiện tại.
// - Nền: thành phố phản chiếu, làm mờ; các thẻ .glass-card bên trong thành kính mờ.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Skyline from './Skyline';
import { PHASES, phaseOf, vnClock, vnHour } from '@/lib/cityTime';

const DISTRICT = {
  main: { name: 'Main City', dot: '#c6bfff' },
  profile: { name: 'Profile City', dot: '#ff9bd2' },
  admin: { name: 'Admin City', dot: '#7ee8ff' },
  island: { name: "Thinh's Island", dot: '#ffd27a' },
};

// key = khoá tòa nhà trên thành phố trang chủ (dùng cho /?b=key)
export const PLACES = {
  news: { district: 'main', place: 'News Tower', hero: 'news' },
  hub: { district: 'main', place: 'Library', hero: 'library' },
  videos: { district: 'main', place: 'Cinema', hero: 'cinema' },
  students: { district: 'main', place: 'Gallery', hero: 'gallery' },
  images: { district: 'main', place: 'Photo Gallery', hero: 'gallery' },
  discussion: { district: 'main', place: 'Town Square', hero: 'square' },
  research: { district: 'main', place: 'Research Archive', hero: 'sign', label: 'Archive', accent: '#ffd27a' },
  search: { district: 'main', place: 'Information Desk', hero: 'sign', label: 'Info', accent: '#c6bfff', back: null },
  journey: { district: 'profile', place: 'Your House', hero: 'house' },
  profile: { district: 'profile', place: 'Residence', hero: 'house' },
  upload: { district: 'profile', place: 'Post Office', hero: 'sign', label: 'Post', accent: '#ff9bd2' },
  dashboard: { district: 'admin', place: 'City Hall', hero: 'sign', label: 'City Hall', accent: '#7ee8ff' },
  visitors: { district: 'admin', place: 'Gatehouse', hero: 'sign', label: 'Visitors', accent: '#7ee8ff' },
  reviews: { district: 'admin', place: 'Feedback Office', hero: 'sign', label: 'Reviews', accent: '#ffd24d' },
  access: { district: 'admin', place: 'Key Office', hero: 'sign', label: 'Access', accent: '#7ee8ff', back: null },
  island: { district: 'island', place: 'Harbour Office', hero: 'island' },
  import: { district: 'admin', place: 'Library Annex', hero: 'sign', label: 'Import', accent: '#b7f07e' },
};

function useCityTime() {
  const [t, setT] = useState(null);
  useEffect(() => {
    const tick = () => {
      const h = vnHour();
      setT({ phase: phaseOf(h), clock: vnClock() });
    };
    tick();
    const id = setInterval(tick, 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return t || { phase: 'day', clock: '' };
}

export default function CityPage({
  place = 'news', title, subtitle, actions = null, width = 'max-w-container', children, className = '',
}) {
  const cfg = PLACES[place] || PLACES.news;
  const d = DISTRICT[cfg.district] || DISTRICT.main;
  const { phase, clock } = useCityTime();
  const p = PHASES[phase];
  const backHref = cfg.back === null ? '/' : `/?b=${place}`;
  const sky = `linear-gradient(180deg, ${p.sky[0]} 0%, ${p.sky[1]} 55%, ${p.sky[2]} 100%)`;

  return (
    <div className={`kw-city kw-city-${phase} relative overflow-hidden ${className}`}>
      {/* ---------- sky header ---------- */}
      <header className="kw-city-head relative overflow-hidden" style={{ background: sky }}>
        {phase === 'night' && <div className="kw-stars" aria-hidden="true" />}
        <div
          aria-hidden="true"
          className="absolute rounded-full"
          style={{
            left: p.sun.x, top: p.sun.y, width: p.sun.size, height: p.sun.size,
            background: p.sun.color, boxShadow: `0 0 70px 24px ${p.sun.glow}`,
          }}
        />
        <Skyline phase={phase} hero={cfg.hero} label={cfg.label} accent={cfg.accent}
          className="absolute left-0 bottom-0 w-full h-[200px]" />

        <div className={`relative z-[2] ${width} mx-auto px-4 md:px-8 pt-[76px] md:pt-[84px]`}>
          <div className="kw-title-card">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={backHref} className="kw-pill !h-[30px] !text-[12px]">
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span>Back to city
              </Link>
              <span className="kw-crumb"><span className="kw-dot" style={{ background: d.dot }} />{d.name} › {cfg.place}</span>
            </div>
            <h1 className="font-display text-[30px] md:text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] text-[#ece9f5] m-0">{title}</h1>
            {subtitle && <p className="text-[14px] leading-relaxed text-[#cfcadd] m-0">{subtitle}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {clock && (
                <span className="text-[12px] text-[#a6a0ba]">
                  <b className="font-display text-[#ece9f5]">{clock}</b> · {p.label} · <span className="text-[#ffd27a]">Vietnam time</span>
                </span>
              )}
              {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
            </div>
          </div>
        </div>
      </header>

      {/* ---------- reflected, blurred city behind the content ---------- */}
      <div className="relative">
        <div aria-hidden="true" className="kw-city-reflect">
          <div className="absolute -left-[10%] -right-[10%] top-0 h-[520px]"
            style={{ background: `linear-gradient(180deg, ${p.sky[2]} 0%, ${p.sky[1]} 35%, transparent 80%)`, opacity: p.haze, filter: 'blur(40px)' }} />
          <Skyline phase={phase} hero={cfg.hero} label={cfg.label} accent={cfg.accent} traffic={false}
            className="kw-reflect-svg" style={{ filter: p.reflect }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(19,18,27,.08) 0%, rgba(19,18,27,.5) 35%, #13121b 72%)' }} />
        </div>

        <div className={`relative ${width} mx-auto px-5 md:px-8 pt-8 pb-24 kw-page`}>
          {children}
        </div>
      </div>
    </div>
  );
}
