'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import RequireAuth from '../../components/RequireAuth';
import { useAuth } from '../../components/AuthProvider';
import { fetchVisitors } from '@/lib/visitor';

const ADMIN_EMAIL = 'thinh.dhl3105@gmail.com';

function VisitorsInner() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [fieldFilter, setFieldFilter] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    fetchVisitors().then((res) => {
      if (res.error) setErr(res.error);
      setRows(res.data || []);
      setLoading(false);
    });
  }, [isAdmin]);

  const fields = useMemo(
    () => Array.from(new Set(rows.map((r) => r.field).filter(Boolean))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (fieldFilter && r.field !== fieldFilter) return false;
      if (!term) return true;
      return (
        (r.full_name || '').toLowerCase().includes(term) ||
        (r.email || '').toLowerCase().includes(term)
      );
    });
  }, [rows, q, fieldFilter]);

  if (!isAdmin) {
    return (
      <div className="pt-32 pb-24 max-w-container mx-auto px-5 md:px-16 text-center">
        <div className="glass-card rounded-card p-10 max-w-md mx-auto">
          <span className="material-symbols-outlined text-primary text-4xl mb-3">admin_panel_settings</span>
          <h1 className="h-md mb-2">Admins only</h1>
          <p className="text-sm text-on-surface-variant mb-6">
            Only the admin account can view this page.
          </p>
          <Link href="/" className="inline-block bg-primary text-on-primary px-6 py-2.5 rounded-lg text-sm font-bold">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 max-w-container mx-auto px-5 md:px-16">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="h-px w-12 bg-primary" />
          <span className="label-sm text-secondary tracking-widest">Admin</span>
          <Link href="/admin/reviews" className="ml-auto text-sm text-on-surface-variant hover:text-primary">
            → View reviews
          </Link>
        </div>
        <h1 className="h-xl mb-3">Visitors</h1>
        <p className="text-on-surface-variant">
          {rows.length} people have registered.
        </p>
      </header>

      {/* Tổng quan theo lĩnh vực */}
      {fields.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFieldFilter('')}
            className={chip(!fieldFilter)}
          >
            All ({rows.length})
          </button>
          {fields.map((f) => (
            <button key={f} onClick={() => setFieldFilter(f)} className={chip(fieldFilter === f)}>
              {f} ({rows.filter((r) => r.field === f).length})
            </button>
          ))}
        </div>
      )}

      {/* Tìm kiếm */}
      <div className="glass-card rounded-full px-4 py-2 flex items-center gap-2 mb-8 max-w-sm">
        <span className="material-symbols-outlined text-on-surface-variant text-xl">search</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or email…"
          className="flex-1 bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-variant/60"
        />
      </div>

      {loading ? (
        <p className="text-on-surface-variant">Loading…</p>
      ) : err ? (
        <p className="text-error glass-card rounded-card p-6">Failed to load data: {err}</p>
      ) : filtered.length === 0 ? (
        <p className="text-on-surface-variant glass-card rounded-card p-8 text-center">
          No one has registered yet.
        </p>
      ) : (
        <div className="glass-card rounded-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-on-surface-variant border-b border-white/10">
                  <th className="px-4 py-3 font-medium">Full name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Birth year</th>
                  <th className="px-4 py-3 font-medium">Field</th>
                  <th className="px-4 py-3 font-medium">Registered</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-on-surface font-medium">{r.full_name}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{r.email}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{r.birth_year || '—'}</td>
                    <td className="px-4 py-3">
                      {r.field && (
                        <span className="inline-block bg-primary/15 text-primary px-2.5 py-0.5 rounded-full text-xs">
                          {r.field}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant/80 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString('en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function chip(active) {
  return active
    ? 'px-3 py-1.5 rounded-full text-xs font-bold bg-primary text-on-primary'
    : 'px-3 py-1.5 rounded-full text-xs font-medium border border-white/10 text-on-surface-variant hover:border-primary/40 transition-colors';
}

export default function AdminVisitorsPage() {
  return (
    <RequireAuth>
      <VisitorsInner />
    </RequireAuth>
  );
}
