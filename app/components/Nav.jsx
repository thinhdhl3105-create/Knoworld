'use client';

// v27: Thanh menu kiểu "Knoworld City" — các nút bo tròn nền tối mờ có chấm màu,
// nổi trên thành phố ở trang chủ. Bên phải: bảng số liệu thành phố (🔥 streak · 👥 số người tham gia),
// tìm kiếm, tài khoản, Upload. Màn hình < 1280px dùng nút ☰.
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import useProgress from './useProgress';
import { publicVisitorCount } from '@/lib/visitor';

const ADMIN_EMAIL = 'thinh.dhl3105@gmail.com';

const CASE_STUDIES = [
  { href: '/videos', label: 'Video Case Studies', icon: 'play_circle' },
  { href: '/students', label: 'Student Case Studies', icon: 'school' },
  { href: '/images', label: 'Image Case Studies', icon: 'image' },
];

const ADMIN_LINKS = [
  { href: '/island', label: "Thinh's Island", icon: 'sailing' },
  { href: '/admin/visitors', label: 'Visitors', icon: 'group' },
  { href: '/admin/reviews', label: 'Reviews', icon: 'reviews' },
  { href: '/admin/access', label: 'Access', icon: 'admin_panel_settings' },
  { href: '/knowledge-hub/import', label: 'Concept Import', icon: 'upload_file' },
];

// Mỗi khu có một màu chấm riêng, giống các quận của thành phố.
const links = [
  { href: '/dashboard', label: 'Dashboard', auth: true, dot: '#7ee8ff' },
  { href: '/research', label: 'Research', auth: true, dot: '#ffd27a' },
  { href: '/knowledge-hub', label: 'Knowledge Hub', dot: '#c6bfff' },
  { group: 'case-studies', label: 'Case Studies', dot: '#5ee0a0', children: CASE_STUDIES },
  { href: '/news', label: 'News', dot: '#ff8a8a' },
  { href: '/discussion', label: 'Discussion', dot: '#ff9bd2' },
  { href: '/games', label: 'Game Island', dot: '#5ee0a0' },
  { href: '/temple', label: 'Temple', dot: '#ffb347' },
  { group: 'admin', label: 'Admin', admin: true, dot: '#7ee8ff', lock: true, children: ADMIN_LINKS },
];

const CITY_ROUTES = [
  '/news', '/knowledge-hub', '/videos', '/students', '/images', '/discussion', '/research', '/search',
  '/journey', '/profile', '/upload', '/dashboard', '/admin', '/island', '/games', '/temple',
];

function Dot({ c }) {
  return <span className="kw-dot" style={{ background: c }} aria-hidden="true" />;
}

// "Bảng số liệu thành phố": streak của bạn + số người đã tham gia.
function CityStats({ progress, streak, explorers, compact = false }) {
  const showStreak = progress?.available;
  if (!showStreak && explorers == null) return null;
  return (
    <Link
      href="/journey"
      className="kw-pill kw-stats"
      title={`${showStreak ? `${streak.current}-day streak (best ${streak.best}) · ` : ''}${explorers ?? '–'} explorers have joined Knoworld`}
    >
      {showStreak && (
        <span className={`kw-stat ${streak.activeToday ? 'is-hot' : ''}`}>
          <span className="material-symbols-outlined" style={streak.activeToday ? { fontVariationSettings: "'FILL' 1" } : undefined}>local_fire_department</span>
          <span className="tabular-nums">{streak.current}</span>
          {!compact && <span className="kw-stat-lbl">day{streak.current === 1 ? '' : 's'}</span>}
        </span>
      )}
      {showStreak && explorers != null && <span className="kw-stat-sep" aria-hidden="true" />}
      {explorers != null && (
        <span className="kw-stat">
          <span className="material-symbols-outlined">groups</span>
          <span className="tabular-nums">{explorers}</span>
          {!compact && <span className="kw-stat-lbl">explorers</span>}
        </span>
      )}
    </Link>
  );
}

export default function Nav() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(null); // case-studies | admin | account
  const [q, setQ] = useState('');
  const [explorers, setExplorers] = useState(null);
  const barRef = useRef(null);
  // v32: đo chỗ trống — nút nào không vừa hàng thì gom vào "More ▾" (không để bị đè).
  const rowRef = useRef(null);
  const brandRef = useRef(null);
  const measureRef = useRef(null);
  const rightRef = useRef(null);
  const [shown, setShown] = useState(99);
  const { progress, streak } = useProgress();
  const isHome = pathname === '/';
  // v28: các trang con có đầu trang bầu trời -> menu trong suốt cho tới khi cuộn xuống.
  const overCity = isHome || CITY_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 220);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [pathname]);
  const transparent = isHome || (overCity && !scrolled);
  const openPalette = () => { setOpen(false); window.dispatchEvent(new CustomEvent('kw-open-palette')); };

  const isAdmin = user?.email === ADMIN_EMAIL;
  const visibleLinks = links.filter((l) => {
    if (l.admin) return isAdmin;
    if (l.auth) return !!user;
    return true;
  });

  useEffect(() => {
    let alive = true;
    publicVisitorCount().then((n) => { if (alive && typeof n === 'number') setExplorers(n); });
    return () => { alive = false; };
  }, []);

  useEffect(() => { setOpen(false); setOpenGroup(null); }, [pathname]);

  const useIso = typeof window === 'undefined' ? useEffect : useLayoutEffect;
  useIso(() => {
    const row = rowRef.current;
    if (!row) return undefined;
    const measure = () => {
      const m = measureRef.current;
      if (!m || window.innerWidth < 1280) { setShown(99); return; }
      const ws = [...m.children].map((c) => c.offsetWidth);
      const moreW = ws.pop();
      const gap = 6;
      const avail = row.clientWidth - (brandRef.current?.offsetWidth || 0) - (rightRef.current?.offsetWidth || 0) - 8 - gap - 8;
      const total = ws.reduce((x, w) => x + w + gap, 0);
      if (total <= avail) { setShown(99); return; }
      let used = moreW;
      let k = 0;
      while (k < ws.length && used + ws[k] + gap <= avail) { used += ws[k] + gap; k += 1; }
      setShown(k);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    if (rightRef.current) ro.observe(rightRef.current);
    window.addEventListener('resize', measure);
    document.fonts?.ready?.then(measure).catch(() => {});
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [user, isAdmin, explorers, progress?.available]);

  useEffect(() => {
    const onDoc = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) { setOpenGroup(null); setOpen(false); }
    };
    const onKey = (e) => { if (e.key === 'Escape') { setOpenGroup(null); setOpen(false); } };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    const term = q.trim();
    setOpen(false);
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : '/search');
  };

  const toggle = (g) => setOpenGroup((x) => (x === g ? null : g));

  return (
    <nav ref={barRef} className={`kw-nav ${transparent ? 'is-home' : ''}`} aria-label="Main">
      <div ref={rowRef} className="kw-nav-row">
        {/* Left: brand + districts */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Link ref={brandRef} href="/" className="kw-pill kw-brand" aria-label="Knoworld City — home">
            <span className="material-symbols-outlined text-[18px] text-primary">location_city</span>
            <span className="font-display text-[15px] font-semibold tracking-tight">Knoworld</span>
          </Link>
          {/* Bản sao ẩn chỉ để đo độ rộng từng nút */}
          <div ref={measureRef} className="kw-nav-measure hidden xl:flex" aria-hidden="true">
            {visibleLinks.map((l) => (
              <span key={l.href || l.group} className="kw-pill">
                <Dot c={l.dot} />{l.label}{l.lock ? ' 🔒' : ''}
                {l.children && <span className="material-symbols-outlined text-[16px] -mr-1">expand_more</span>}
              </span>
            ))}
            <span className="kw-pill">More<span className="material-symbols-outlined text-[16px] -mr-1">expand_more</span></span>
          </div>
          <div className="kw-nav-links hidden xl:flex items-center gap-1.5">
            {visibleLinks.slice(0, shown).map((l) => {
              if (l.children) {
                const isOpen = openGroup === l.group;
                const groupActive = l.children.some((c) => pathname === c.href);
                return (
                  <div key={l.group} className="relative">
                    <button type="button" onClick={() => toggle(l.group)} aria-expanded={isOpen}
                      className={`kw-pill ${groupActive ? 'is-on' : ''}`}>
                      <Dot c={l.dot} />{l.label}{l.lock ? ' 🔒' : ''}
                      <span className={`material-symbols-outlined text-[16px] -mr-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                    </button>
                    {isOpen && (
                      <div className="kw-menu left-0 w-60">
                        {l.children.map((c) => (
                          <Link key={c.href} href={c.href} className={`kw-menu-item ${pathname === c.href ? 'is-on' : ''}`}>
                            <span className="material-symbols-outlined text-lg">{c.icon}</span>{c.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              const active = pathname === l.href || (l.href !== '/' && pathname.startsWith(`${l.href}/`));
              return (
                <Link key={l.href} href={l.href} className={`kw-pill ${active ? 'is-on' : ''}`}>
                  <Dot c={l.dot} />{l.label}
                </Link>
              );
            })}
            {shown < visibleLinks.length && (() => {
              const rest = visibleLinks.slice(shown);
              const isOpen = openGroup === 'more';
              const restActive = rest.some((l) => (l.children ? l.children.some((c) => pathname === c.href) : pathname === l.href || pathname.startsWith(`${l.href}/`)));
              return (
                <div className="relative">
                  <button type="button" onClick={() => toggle('more')} aria-expanded={isOpen}
                    className={`kw-pill ${restActive ? 'is-on' : ''}`}>
                    More
                    <span className={`material-symbols-outlined text-[16px] -mr-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                  </button>
                  {isOpen && (
                    <div className="kw-menu right-0 w-60">
                      {rest.map((l) => (l.children ? (
                        <div key={l.group} className="mt-1">
                          <div className="kw-menu-label"><Dot c={l.dot} />{l.label}{l.lock ? ' 🔒' : ''}</div>
                          {l.children.map((c) => (
                            <Link key={c.href} href={c.href} className={`kw-menu-item pl-6 ${pathname === c.href ? 'is-on' : ''}`}>
                              <span className="material-symbols-outlined text-lg">{c.icon}</span>{c.label}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <Link key={l.href} href={l.href} className={`kw-menu-item ${pathname === l.href ? 'is-on' : ''}`}>
                          <Dot c={l.dot} />{l.label}
                        </Link>
                      )))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right: city stats board + search + account */}
        <div ref={rightRef} className="flex items-center gap-1.5 shrink-0">
          <div className="hidden 2xl:block"><CityStats progress={progress} streak={streak} explorers={explorers} /></div>
          <div className="2xl:hidden"><CityStats progress={progress} streak={streak} explorers={explorers} compact /></div>

          <button type="button" onClick={openPalette} className="kw-pill hidden 2xl:inline-flex" aria-label="Search (Ctrl+K)">
            <span className="material-symbols-outlined text-[18px]">search</span>
            <span className="opacity-70 font-medium">Search</span>
            <kbd className="text-[10px] border border-white/15 rounded px-1 py-0.5 opacity-60 font-normal">Ctrl K</kbd>
          </button>
          <button type="button" onClick={openPalette} className="kw-pill kw-icon 2xl:hidden" aria-label="Search (Ctrl+K)" title="Search (Ctrl+K)">
            <span className="material-symbols-outlined text-[18px]">search</span>
          </button>

          <div className="relative hidden sm:block">
            {user ? (
              <>
                <button type="button" onClick={() => toggle('account')} aria-expanded={openGroup === 'account'}
                  className={`kw-pill ${pathname === '/profile' || pathname === '/journey' ? 'is-on' : ''}`}>
                  <Dot c="#ff9bd2" /><span className="hidden 2xl:inline">Profile</span>
                  <span className="material-symbols-outlined text-[18px] 2xl:hidden" aria-label="Profile">person</span>
                  <span className={`material-symbols-outlined text-[16px] -mr-1 transition-transform ${openGroup === 'account' ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                {openGroup === 'account' && (
                  <div className="kw-menu right-0 w-52">
                    <Link href="/profile" className="kw-menu-item"><span className="material-symbols-outlined text-lg">person</span>My Profile</Link>
                    <Link href="/journey" className="kw-menu-item"><span className="material-symbols-outlined text-lg">local_fire_department</span>My Journey</Link>
                    <button type="button" onClick={() => { setOpenGroup(null); signOut(); }} className="kw-menu-item w-full">
                      <span className="material-symbols-outlined text-lg">logout</span>Sign Out
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Link href="/login" className="kw-pill"><Dot c="#ff9bd2" />Sign In</Link>
            )}
          </div>

          <Link href={user ? '/upload' : '/login'} className="kw-pill is-accent hidden sm:inline-flex" title="Upload">
            <span className="material-symbols-outlined text-[18px]">upload</span><span className="hidden 2xl:inline">Upload</span>
          </Link>

          <button type="button" className="kw-pill kw-icon xl:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">
            <span className="material-symbols-outlined text-[20px]">{open ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {open && (
        <div className="xl:hidden kw-menu kw-menu-sheet">
          <form onSubmit={submitSearch} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 mb-2">
            <span className="material-symbols-outlined text-on-surface-variant text-xl">search</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search everything…"
              className="flex-1 bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-variant/60" />
          </form>
          {visibleLinks.map((l) => (l.children ? (
            <div key={l.group} className="mt-1">
              <div className="kw-menu-label"><Dot c={l.dot} />{l.label}</div>
              {l.children.map((c) => (
                <Link key={c.href} href={c.href} className={`kw-menu-item pl-6 ${pathname === c.href ? 'is-on' : ''}`}>
                  <span className="material-symbols-outlined text-lg">{c.icon}</span>{c.label}
                </Link>
              ))}
            </div>
          ) : (
            <Link key={l.href} href={l.href} className={`kw-menu-item ${pathname === l.href ? 'is-on' : ''}`}>
              <Dot c={l.dot} />{l.label}
            </Link>
          )))}
          <div className="border-t border-white/10 my-2" />
          {user ? (
            <>
              <Link href="/profile" className="kw-menu-item"><span className="material-symbols-outlined text-lg">person</span>My Profile</Link>
              <Link href="/journey" className="kw-menu-item"><span className="material-symbols-outlined text-lg">local_fire_department</span>My Journey</Link>
              <Link href="/upload" className="kw-menu-item"><span className="material-symbols-outlined text-lg">upload</span>Upload</Link>
              <button type="button" onClick={() => { setOpen(false); signOut(); }} className="kw-menu-item w-full">
                <span className="material-symbols-outlined text-lg">logout</span>Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/profile" className="kw-menu-item"><span className="material-symbols-outlined text-lg">person</span>Profile</Link>
              <Link href="/login" className="kw-menu-item"><span className="material-symbols-outlined text-lg">login</span>Sign In · Upload</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
