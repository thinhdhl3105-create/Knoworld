'use client';

// v17: Case Studies dropdown (Video / Student / Image) + tighter search box
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';

const ADMIN_EMAIL = 'thinh.dhl3105@gmail.com';

// Case Studies is a grouped menu: one entry on the bar, three destinations.
const CASE_STUDIES = [
  { href: '/videos', label: 'Video Case Studies', icon: 'play_circle' },
  { href: '/students', label: 'Student Case Studies', icon: 'school' },
  { href: '/images', label: 'Image Case Studies', icon: 'image' },
];

const links = [
  { href: '/dashboard', label: 'Dashboard', auth: true },
  { href: '/research', label: 'Research Archive', auth: true },
  { href: '/knowledge-hub', label: 'Knowledge Hub', auth: true },
  { group: 'case-studies', label: 'Case Studies', children: CASE_STUDIES },
  { href: '/discussion', label: 'Discussion' },
  { href: '/admin/visitors', label: 'Visitors', admin: true },
  { href: '/admin/reviews', label: 'Reviews', admin: true },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [csOpen, setCsOpen] = useState(false); // desktop Case Studies dropdown
  const [q, setQ] = useState('');
  const csRef = useRef(null);

  // Research Archive & Knowledge Hub are members-only; admin pages are admin-only.
  const isAdmin = user?.email === ADMIN_EMAIL;
  const visibleLinks = links.filter((l) => {
    if (l.admin) return isAdmin;
    if (l.auth) return !!user;
    return true;
  });

  // Close the dropdown when clicking outside it.
  useEffect(() => {
    const onDoc = (e) => {
      if (csRef.current && !csRef.current.contains(e.target)) setCsOpen(false);
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

  const csActive = CASE_STUDIES.some((c) => pathname === c.href);

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 nav-blur border-b border-white/10">
      <div className="flex justify-between items-center px-5 md:px-16 h-20 w-full max-w-container mx-auto">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">blur_on</span>
            <span className="font-display text-xl font-semibold tracking-tight">Knoworld</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            {visibleLinks.map((l) => {
              if (l.group === 'case-studies') {
                return (
                  <div key="case-studies" ref={csRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setCsOpen((v) => !v)}
                      className={
                        (csActive
                          ? 'text-primary font-bold '
                          : 'text-on-surface-variant hover:text-on-surface ') +
                        'text-sm inline-flex items-center gap-1 transition-colors'
                      }
                    >
                      {l.label}
                      <span className={`material-symbols-outlined text-base transition-transform ${csOpen ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </button>
                    {csOpen && (
                      <div className="absolute left-0 top-full mt-3 w-56 glass-card rounded-card p-1.5 shadow-xl border border-white/10">
                        {l.children.map((c) => {
                          const active = pathname === c.href;
                          return (
                            <Link
                              key={c.href}
                              href={c.href}
                              onClick={() => setCsOpen(false)}
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
                      ? 'text-sm text-primary font-bold border-b-2 border-primary pb-1'
                      : 'text-sm text-on-surface-variant hover:text-on-surface transition-colors'
                  }
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <form onSubmit={submitSearch} className="hidden lg:flex items-center gap-1.5 glass-card rounded-full px-2.5 py-1.5 focus-within:border-primary/50 transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant text-lg">search</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="w-20 xl:w-28 bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-variant/60"
            />
          </form>
          <Link href="/search" className="lg:hidden material-symbols-outlined text-on-surface-variant hover:text-primary" aria-label="Search">
            search
          </Link>

          {user ? (
            <>
              <Link href="/profile" className="hidden sm:inline text-sm text-on-surface-variant hover:text-primary transition-colors">
                Profile
              </Link>
              <button onClick={signOut} className="text-sm text-on-surface-variant hover:text-primary transition-colors">
                Sign Out
              </button>
              <Link href="/upload" className="bg-primary text-on-primary px-5 py-2 rounded-full text-sm font-bold hover:scale-95 transition-transform">
                Upload
              </Link>
            </>
          ) : (
            <>
              <Link href="/profile" className="hidden sm:inline text-sm text-on-surface-variant hover:text-primary transition-colors">
                Profile
              </Link>
              <Link href="/login" className="text-sm text-on-surface-variant hover:text-primary transition-colors">
                Sign In
              </Link>
              <Link href="/login" className="bg-primary text-on-primary px-5 py-2 rounded-full text-sm font-bold hover:scale-95 transition-transform">
                Upload
              </Link>
            </>
          )}
          <button className="md:hidden material-symbols-outlined" onClick={() => setOpen(!open)}>
            {open ? 'close' : 'menu'}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/10 bg-background/95 px-5 py-4 flex flex-col gap-4">
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
            if (l.group === 'case-studies') {
              return (
                <div key="case-studies" className="flex flex-col gap-1">
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
