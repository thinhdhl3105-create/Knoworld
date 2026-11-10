'use client';

// v17: Case Studies dropdown (Video / Student / Image) + tighter search box
// v25: Visitors + Reviews gom vào menu Admin; menu đầy đủ chỉ hiện từ xl để không đè ô Search
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import useProgress from './useProgress';

const ADMIN_EMAIL = 'thinh.dhl3105@gmail.com';

// Case Studies is a grouped menu: one entry on the bar, three destinations.
const CASE_STUDIES = [
  { href: '/videos', label: 'Video Case Studies', icon: 'play_circle' },
  { href: '/students', label: 'Student Case Studies', icon: 'school' },
  { href: '/images', label: 'Image Case Studies', icon: 'image' },
];

// v25: trang quản trị gom vào 1 menu để thanh điều hướng không chật.
const ADMIN_LINKS = [
  { href: '/admin/visitors', label: 'Visitors', icon: 'group' },
  { href: '/admin/reviews', label: 'Reviews', icon: 'reviews' },
];

const links = [
  { href: '/dashboard', label: 'Dashboard', auth: true },
  { href: '/research', label: 'Research Archive', auth: true },
  { href: '/knowledge-hub', label: 'Knowledge Hub' }, // v21: công khai
  { group: 'case-studies', label: 'Case Studies', children: CASE_STUDIES },
  { href: '/news', label: 'News' },
  { href: '/discussion', label: 'Discussion' },
  { group: 'admin', label: 'Admin', admin: true, children: ADMIN_LINKS },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(null); // desktop dropdown đang mở (case-studies | admin)
  const [q, setQ] = useState('');
  const groupsRef = useRef(null);
  const { progress, streak } = useProgress();
  const openPalette = () => { setOpen(false); window.dispatchEvent(new CustomEvent('kw-open-palette')); };

  // Research Archive is members-only; admin pages are admin-only. (v21: Knowledge Hub is public.)
  const isAdmin = user?.email === ADMIN_EMAIL;
  const visibleLinks = links.filter((l) => {
    if (l.admin) return isAdmin;
    if (l.auth) return !!user;
    return true;
  });

  // Close the dropdown when clicking outside it.
  useEffect(() => {
    const onDoc = (e) => {
      if (groupsRef.current && !groupsRef.current.contains(e.target)) setOpenGroup(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    const term = q.trim();
    setOpen(false);
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : '/search');
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 nav-blur border-b border-white/10">
      <div className="flex justify-between items-center gap-6 px-5 md:px-10 2xl:px-16 h-20 w-full max-w-container mx-auto">
        <div className="flex items-center gap-8 min-w-0">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="material-symbols-outlined text-primary">blur_on</span>
            <span className="font-display text-xl font-semibold tracking-tight">Knoworld</span>
          </Link>
          <div ref={groupsRef} className="hidden xl:flex items-center gap-5">
            {visibleLinks.map((l) => {
              if (l.children) {
                const isOpen = openGroup === l.group;
                const groupActive = l.children.some((c) => pathname === c.href);
                return (
                  <div key={l.group} className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenGroup((g) => (g === l.group ? null : l.group))}
                      className={
                        (groupActive
                          ? 'text-primary font-bold '
                          : 'text-on-surface-variant hover:text-on-surface ') +
                        'text-sm whitespace-nowrap inline-flex items-center gap-1 transition-colors'
                      }
                    >
                      {l.label}
                      <span className={`material-symbols-outlined text-base transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </button>
                    {isOpen && (
                      <div className="absolute left-0 top-full mt-3 w-56 glass-card rounded-card p-1.5 shadow-xl border border-white/10">
                        {l.children.map((c) => {
                          const active = pathname === c.href;
                          return (
                            <Link
                              key={c.href}
                              href={c.href}
                              onClick={() => setOpenGroup(null)}
                              className={
                                (active ? 'text-primary bg-white/[0.04] ' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/[0.04] ') +
                                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors'
                              }
                            >
                              <span className="material-symbols-outlined text-lg">{c.icon}</span>
                              {c.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    active
                      ? 'text-sm whitespace-nowrap text-primary font-bold border-b-2 border-primary pb-1'
                      : 'text-sm whitespace-nowrap text-on-surface-variant hover:text-on-surface transition-colors'
                  }
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <button type="button" onClick={openPalette}
            className="hidden lg:flex items-center gap-1.5 glass-card rounded-full pl-2.5 pr-2 py-1.5 hover:border-primary/50 transition-colors text-on-surface-variant"
            aria-label="Search (Ctrl+K)">
            <span className="material-symbols-outlined text-lg">search</span>
            <span className="text-sm w-14 xl:w-20 text-left opacity-70">Search…</span>
            <kbd className="text-[10px] border border-white/15 rounded px-1 py-0.5 opacity-70">Ctrl K</kbd>
          </button>
          <button type="button" onClick={openPalette} className="lg:hidden material-symbols-outlined text-on-surface-variant hover:text-primary" aria-label="Search">
            search
          </button>

          {progress?.available && (
            <Link href="/journey" title={`${streak.current}-day streak · My Journey`}
              className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold border transition-colors ${
                streak.activeToday ? 'border-[#ff8a3d]/50 text-[#ffb27a] bg-[#ff8a3d]/10' : 'border-white/10 text-on-surface-variant hover:border-[#ff8a3d]/40'
              }`}>
              <span className="material-symbols-outlined text-lg" style={streak.activeToday ? { fontVariationSettings: "'FILL' 1" } : undefined}>local_fire_department</span>
              <span className="tabular-nums">{streak.current}</span>
            </Link>
          )}

          {user ? (
            <>
              <Link href="/profile" className="hidden sm:inline whitespace-nowrap text-sm text-on-surface-variant hover:text-primary transition-colors">
                Profile
              </Link>
              <button onClick={signOut} className="whitespace-nowrap text-sm text-on-surface-variant hover:text-primary transition-colors">
                Sign Out
              </button>
              <Link href="/upload" className="whitespace-nowrap bg-primary text-on-primary px-5 py-2 rounded-full text-sm font-bold hover:scale-95 transition-transform">
                Upload
              </Link>
            </>
          ) : (
            <>
              <Link href="/profile" className="hidden sm:inline whitespace-nowrap text-sm text-on-surface-variant hover:text-primary transition-colors">
                Profile
              </Link>
              <Link href="/login" className="whitespace-nowrap text-sm text-on-surface-variant hover:text-primary transition-colors">
                Sign In
              </Link>
              <Link href="/login" className="whitespace-nowrap bg-primary text-on-primary px-5 py-2 rounded-full text-sm font-bold hover:scale-95 transition-transform">
                Upload
              </Link>
            </>
          )}
          <button className="xl:hidden material-symbols-outlined" onClick={() => setOpen(!open)}>
            {open ? 'close' : 'menu'}
          </button>
        </div>
      </div>

      {open && (
        <div className="xl:hidden border-t border-white/10 bg-background/95 px-5 py-4 flex flex-col gap-4">
          <form onSubmit={submitSearch} className="flex items-center gap-2 glass-card rounded-full px-3 py-2 mb-1">
            <span className="material-symbols-outlined text-on-surface-variant text-xl">search</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search everything…"
              className="flex-1 bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-variant/60"
            />
          </form>
          {visibleLinks.map((l) => {
            if (l.children) {
              return (
                <div key={l.group} className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-secondary font-bold">{l.label}</span>
                  {l.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 pl-2 py-1 text-on-surface-variant hover:text-on-surface"
                    >
                      <span className="material-symbols-outlined text-lg">{c.icon}</span>
                      {c.label}
                    </Link>
                  ))}
                </div>
              );
            }
            return (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                {l.label}
              </Link>
            );
          })}
          <Link href="/profile" onClick={() => setOpen(false)} className="text-on-surface-variant hover:text-on-surface">
            Profile
          </Link>
        </div>
      )}
    </nav>
  );
}
