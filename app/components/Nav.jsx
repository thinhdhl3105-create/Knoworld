'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from './AuthProvider';

const links = [
  { href: '/research', label: 'Research Archive' },
  { href: '/knowledge-hub', label: 'Knowledge Hub' },
  { href: '/videos', label: 'Video Case Studies' },
  { href: '/students', label: 'Student Case Studies' },
];

export default function Nav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 nav-blur border-b border-white/10">
      <div className="flex justify-between items-center px-5 md:px-16 h-20 w-full max-w-container mx-auto">
        <div className="flex items-center gap-12">
          <Link href="/" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">blur_on</span>
            <span className="font-display text-xl font-semibold tracking-tight">Knoworld</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => {
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

        <div className="flex items-center gap-4 md:gap-6">
          {user ? (
            <>
              <Link href="/upload" className="hidden sm:inline text-sm text-on-surface-variant hover:text-primary transition-colors">
                Dashboard
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
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-on-surface-variant hover:text-on-surface">
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
