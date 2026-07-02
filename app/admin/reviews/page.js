'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import RequireAuth from '../../components/RequireAuth';
import { useAuth } from '../../components/AuthProvider';
import { fetchReviews, reviewStats } from '@/lib/reviews';

const ADMIN_EMAIL = 'thinh.dhl3105@gmail.com';

const CRITERIA = [
  { key: 'convenience', label: 'Convenience' },
  { key: 'content', label: 'Content' },
  { key: 'overall', label: 'Overall' },
];

function Stars({ value }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className="material-symbols-outlined text-base leading-none"
          style={{
            color: n <= value ? '#f6bd56' : 'rgba(200,196,215,0.3)',
            fontVariationSettings: n <= value ? "'FILL' 1" : "'FILL' 0",
          }}
        >
          star
        </span>
      ))}
    </span>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="glass-card rounded-card p-5">
      <p className="text-xs text-on-surface-variant mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-3xl font-semibold text-primary">
          {value ? value.toFixed(2) : '—'}
        </span>
        <span className="text-xs text-on-surface-variant">/ 5</span>
      </div>
    </div>
  );
}

function ReviewsInner() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    fetchReviews().then((res) => {
      if (res.error) setErr(res.error);
      setRows(res.data || []);
      setLoading(false);
    });
  }, [isAdmin]);

  const stats = useMemo(() => reviewStats(rows), [rows]);

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
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="h-px w-12 bg-primary" />
          <span className="label-sm text-secondary tracking-widest">Admin</span>
        </div>
        <h1 className="h-xl mb-3">User Reviews</h1>
        <p className="text-on-surface-variant">
          {stats.count} reviews collected.
        </p>
      </header>

      {/* Điểm trung bình */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <div className="glass-card rounded-card p-5">
          <p className="text-xs text-on-surface-variant mb-2">Total reviews</p>
          <span className="font-display text-3xl font-semibold text-primary">{stats.count}</span>
        </div>
        <StatCard label="Convenience" value={stats.convenience} />
        <StatCard label="Content" value={stats.content} />
        <StatCard label="Overall" value={stats.overall} />
      </div>

      {/* Danh sách */}
      {loading ? (
        <p className="text-on-surface-variant">Loading…</p>
      ) : err ? (
        <p className="text-error glass-card rounded-card p-6">Failed to load data: {err}</p>
      ) : rows.length === 0 ? (
        <p className="text-on-surface-variant glass-card rounded-card p-8 text-center">
          No reviews yet.
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.id} className="glass-card rounded-card p-5">
              {(r.visitor_name || r.visitor_email) && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 pb-3 border-b border-white/5">
                  <span className="material-symbols-outlined text-primary text-lg">person</span>
                  <span className="text-sm font-medium text-on-surface">{r.visitor_name || 'Guest'}</span>
                  {r.visitor_email && (
                    <span className="text-xs text-on-surface-variant">{r.visitor_email}</span>
                  )}
                  {r.visitor_field && (
                    <span className="inline-block bg-primary/15 text-primary px-2.5 py-0.5 rounded-full text-xs">
                      {r.visitor_field}
                    </span>
                  )}
                  {r.visitor_birth_year && (
                    <span className="text-xs text-on-surface-variant/80">Born: {r.visitor_birth_year}</span>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  {CRITERIA.map((c) => (
                    <span key={c.key} className="flex items-center gap-1.5 text-sm">
                      <span className="text-on-surface-variant">{c.label}:</span>
                      <Stars value={r[`rating_${c.key}`]} />
                    </span>
                  ))}
                </div>
                <span className="text-xs text-on-surface-variant">
                  {new Date(r.created_at).toLocaleString('en-US')}
                </span>
              </div>
              {r.comment && (
                <p className="text-sm text-on-surface leading-relaxed border-l-2 border-primary/40 pl-3">
                  {r.comment}
                </p>
              )}
              {r.page_path && (
                <p className="text-xs text-on-surface-variant/70 mt-2">Page: {r.page_path}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminReviewsPage() {
  return (
    <RequireAuth>
      <ReviewsInner />
    </RequireAuth>
  );
}
