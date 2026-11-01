'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { recordDailyVisit, earnedBadges, toast } from '@/lib/engagement';
import { hasRegistered } from '@/lib/visitor';
import CommandPalette from './CommandPalette';
import useProgress from './useProgress';

// v24: Lớp tương tác toàn cục — ghi "đã ghé hôm nay", toast, Ctrl+K,
// tour cho người mới, thông báo mở khoá huy hiệu, thanh điều hướng dưới (mobile).
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

const TOUR = [
  { icon: 'hub', title: 'Explore the constellation', text: 'The Knowledge Hub is a living map. Hover a concept to light up its connections, scroll to zoom, and fly to any idea with the search box.' },
  { icon: 'psychology', title: 'Think first, then reveal', text: 'Student case studies let you pause and form your own idea before revealing the insight. React with 💡 🤔 🔥 to what moves you.' },
  { icon: 'local_fire_department', title: 'Grow your journey', text: 'Every concept and case you open builds your streak and unlocks discovery badges — no tests, just curiosity. Press Ctrl + K anytime to search.' },
];

function OnboardingTour() {
  const [step, setStep] = useState(-1);
  useEffect(() => {
    let done = false;
    try { done = localStorage.getItem('kw_tour_done') === '1'; } catch { /* ignore */ }
    if (done) return;
    // Chờ người dùng qua cổng đăng ký rồi mới chào.
    const t = setInterval(() => {
      if (hasRegistered()) { clearInterval(t); setTimeout(() => setStep(0), 1200); }
    }, 1000);
    return () => clearInterval(t);
  }, []);
  const finish = () => { setStep(-1); try { localStorage.setItem('kw_tour_done', '1'); } catch { /* ignore */ } };
  if (step < 0) return null;
  const s = TOUR[step];
  return (
    <div className="fixed inset-x-4 bottom-20 md:bottom-6 md:left-6 md:right-auto md:w-[380px] z-[70] glass-card rounded-xl p-5 shadow-2xl shadow-black/50 kw-rise" role="dialog" aria-label="Welcome tour">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 shrink-0 rounded-full bg-primary/15 grid place-items-center">
          <span className="material-symbols-outlined text-primary">{s.icon}</span>
        </span>
        <div className="flex-1">
          <p className="label-sm text-secondary mb-1">Welcome · {step + 1}/{TOUR.length}</p>
          <h3 className="font-display text-lg font-medium mb-1">{s.title}</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed">{s.text}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4">
        <div className="flex gap-1.5">
          {TOUR.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-primary' : 'w-1.5 bg-white/20'}`} />)}
        </div>
        <button onClick={finish} className="ml-auto text-xs text-on-surface-variant hover:text-primary px-2">Skip</button>
        <button
          onClick={() => (step < TOUR.length - 1 ? setStep(step + 1) : finish())}
          className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-bold hover:scale-95 transition-transform"
        >
          {step < TOUR.length - 1 ? 'Next' : "Let's explore"}
        </button>
      </div>
    </div>
  );
}

const BOTTOM = [
  { href: '/', icon: 'home', label: 'Home' },
  { href: '/knowledge-hub', icon: 'hub', label: 'Hub' },
  { href: '/students', icon: 'cases', label: 'Cases', match: ['/students', '/videos', '/images'] },
  { href: '/discussion', icon: 'forum', label: 'Discuss' },
  { href: '/journey', icon: 'local_fire_department', label: 'Journey' },
];

function MobileBottomNav() {
  const pathname = usePathname() || '/';
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background/90 nav-blur border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {BOTTOM.map((b) => {
          const active = b.href === '/' ? pathname === '/' : (b.match || [b.href]).some((m) => pathname.startsWith(m));
          return (
            <Link key={b.href} href={b.href} className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${active ? 'text-primary' : 'text-on-surface-variant'}`}>
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
      {!skip && <OnboardingTour />}
      {!pathname.startsWith('/admin') && <MobileBottomNav />}
    </>
  );
}
