'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

// Wrap any page that should only be visible to signed-in users.
// Unauthenticated visitors are sent to /login and returned here afterwards.
export default function RequireAuth({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return (
      <div className="pt-32 px-5 max-w-container mx-auto text-on-surface-variant">Loading…</div>
    );
  }

  if (!user) {
    return (
      <div className="pt-32 pb-24 max-w-container mx-auto px-5 md:px-16 text-center">
        <div className="glass-card rounded-card p-10 max-w-md mx-auto">
          <span className="material-symbols-outlined text-primary text-4xl mb-3">lock</span>
          <h1 className="h-md mb-2">Members only</h1>
          <p className="text-sm text-on-surface-variant mb-6">
            Đăng nhập để xem phần này. Đang chuyển tới trang đăng nhập…
          </p>
          <a href={`/login?next=${encodeURIComponent(pathname)}`}
            className="inline-block bg-primary text-on-primary px-6 py-2.5 rounded-lg text-sm font-bold">
            Đăng nhập
          </a>
        </div>
      </div>
    );
  }

  return children;
}
