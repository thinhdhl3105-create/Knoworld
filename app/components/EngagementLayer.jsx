'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { recordDailyVisit, earnedBadges, toast } from '@/lib/engagement';
import CommandPalette from './CommandPalette';
import Onboarding from './onboarding/Onboarding';
import LumiPeek from './onboarding/LumiPeek';
import useProgress from './useProgress';

// v24: Lớp tương tác toàn cục — ghi "đã ghé hôm nay", toast, Ctrl+K,
// hướng dẫn người mới cùng Lumi (v58), thông báo mở khoá huy hiệu, thanh điều hướng dưới (mobile).
const SKIP = ['/login', '/admin', '/upload'];

function Toaster() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const on = (e) => {
      const id = Math.random().toString(36).slice(2);
      setItems((xs) => [...xs.slice(-2), { id, ...e.detail }]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3600);
    };
    window.addEventListener('kw-toast', on);
    return () => window.removeEventListener('kw-toast', on);
  }, []);
  return (
    <div className="fixed inset-x-0 top-24 z-[90] flex flex-col items-center gap-2 px-4 pointer-events-none" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="glass-card rounded-full pl-3 pr-4 py-2 shadow-xl shadow-black/40 flex items-center gap-2 text-sm kw-rise max-w-full">
          <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>{t.icon}</span>
          <span className="text-on-surface">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// Báo khi người học vừa mở khoá huy hiệu mới / giữ streak.
function BadgeWatcher() {
  const { progress, streak } = useProgress();
  const first = useRef(true);
  useEffect(() => {
    if (!progress?.available) return;
    const earned = earnedBadges(progress, streak).filter((b) => b.earned).map((b) => b.id);
    let known = [];
    try { known = JSON.parse(localStorage.getItem('kw_badges_seen') || 'null'); } catch { known = null; }
    if (known === null) {
      // Lần đầu: ghi nhận im lặng, không spam thông báo.
      try { localStorage.setItem('kw_badges_seen', JSON.stringify(earned)); } catch { /* ignore */ }
      first.current = false;
      return;
    }
    const fresh = earned.filter((id) => !known.includes(id));
    if (fresh.length) {
      const b = earnedBadges(progress, streak).find((x) => x.id === fresh[0]);
      toast(`Badge unlocked: ${b.name} — ${b.desc}`, b.icon);
      try { localStorage.setItem('kw_badges_seen', JSON.stringify(earned)); } catch { /* ignore */ }
    }
    first.current = false;
  }, [progress, streak]);
  return null;
}

const BOTTOM = [
  { href: '/', icon: 'home', label: 'Home' },
  { href: '/knowledge-hub', icon: 'hub', label: 'Hub', tour: 'knowledge-hub' },
  { href: '/students', icon: 'cases', label: 'Cases', match: ['/students', '/videos', '/images'], tour: 'case-studies' },
  { href: '/discussion', icon: 'forum', label: 'Discuss' },
  { href: '/journey', icon: 'local_fire_department', label: 'Journey', tour: 'journey' },
];

function MobileBottomNav() {
  const pathname = usePathname() || '/';
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background/90 nav-blur border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {BOTTOM.map((b) => {
          const active = b.href === '/' ? pathname === '/' : (b.match || [b.href]).some((m) => pathname.startsWith(m));
          return (
            <Link key={b.href} href={b.href} data-tour={b.tour} className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${active ? 'text-primary' : 'text-on-surface-variant'}`}>
              <span className="material-symbols-outlined text-[22px]" style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>{b.icon}</span>
              {b.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Hiện các phần tử .kw-reveal khi cuộn tới.
function RevealOnScroll() {
  const pathname = usePathname();
  useEffect(() => {
    const els = document.querySelectorAll('.kw-reveal:not(.is-in)');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [pathname]);
  return null;
}

export default function EngagementLayer() {
  const pathname = usePathname() || '/';
  const skip = SKIP.some((p) => pathname.startsWith(p));
  useEffect(() => { if (!skip) recordDailyVisit(); }, [skip, pathname]);
  return (
    <>
      <Toaster />
      <CommandPalette />
      <RevealOnScroll />
      {!skip && <BadgeWatcher />}
      {/* v58: tour cũ 3 thẻ (OnboardingTour) được thay bằng hướng dẫn cùng Lumi */}
      {!skip && <Onboarding />}
      {/* v59: Lumi lấp ló ở góc màn hình vào những khoảnh khắc nhỏ */}
      {!skip && <LumiPeek />}
      {!pathname.startsWith('/admin') && <MobileBottomNav />}
    </>
  );
}
