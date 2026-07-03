'use client';

// v16: added Discussion link
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from './AuthProvider';

const ADMIN_EMAIL = 'thinh.dhl3105@gmail.com';

const links = [
  { href: '/dashboard', label: 'Dashboard', auth: true },
  { href: '/research', label: 'Research Archive', auth: true },
  { href: '/knowledge-hub', label: 'Knowledge Hub', auth: true },
  { href: '/videos', label: 'Video Case Studies' },
  { href: '/students', label: 'Student Case Studies' },
  { href: '/discussion', label: 'Discussion' },
  { href: '/admin/visitors', label: 'Visitors', admin: true },
  { href: '/admin/reviews', label: 'Reviews', admin: true },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  // Research Archive & Knowledge Hub are members-only; Đánh giá is admin-only.
  const isAdmin = user?.email === ADMIN_EMAIL;
  const visibleLinks = links.filter((l) => {
    if (l.admin) return isAdmin;
    if (l.auth) return !!user;
    return true;
  });

  const submitSearch = (e) => {
    e.preventDefault();
    const term = q.trim();
    setOpen(false);
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : '/search');
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 nav-blur border-b border-white/10">
      <div className="flex justify-between items-center px-5 md:px-16 h-20 w-full max-w-container mx-auto">
        <div className="flex items-center gap-12">
          <Link href="/" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">blur_on</span>
            <span className="font-display text-xl font-semibold tracking-tight">Knoworld</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {visibleLinks.map((l) => {
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

        <div className="flex items-center gap-3 md:gap-5">
          <form onSubmit={submitSearch} className="hidden lg:flex items-center gap-2 glass-card rounded-full px-3 py-1.5 focus-within:border-primary/50 transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant text-xl">search</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="w-32 xl:w-44 bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-variant/60"
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
              <Link href="/upload" className="bg-primary text-on-primary px-6 py-2 rounded-full text-sm font-bold hover:scale-95 transition-transform">
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
              <Link href="/login" className="bg-primary text-on-primary px-6 py-2 rounded-full text-sm font-bold hover:scale-95 transition-transform">
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
          {visibleLinks.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-on-surface-variant hover:text-on-surface">
              {l.label}
            </Link>
          ))}
          <Link href="/profile" onClick={() => setOpen(false)} className="text-on-surface-variant hover:text-on-surface">
            Profile
          </Link>
        </div>
      )}
    </nav>
  );
}
