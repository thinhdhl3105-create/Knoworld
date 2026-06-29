'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import RequireAuth from '../../components/RequireAuth';
import { useAuth } from '../../components/AuthProvider';
import { fetchReviews, reviewStats } from '@/lib/reviews';

const ADMIN_EMAIL = 'thinh.dhl3105@gmail.com';

const CRITERIA = [
  { key: 'convenience', label: 'Sự tiện lợi' },
  { key: 'content', label: 'Nội dung' },
  { key: 'overall', label: 'Tổng quan' },
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
          <h1 className="h-md mb-2">Chỉ dành cho admin</h1>
          <p className="text-sm text-on-surface-variant mb-6">
            Trang này chỉ tài khoản quản trị mới xem được.
          </p>
          <Link href="/" className="inline-block bg-primary text-on-primary px-6 py-2.5 rounded-lg text-sm font-bold">
            Về trang chủ
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
        <h1 className="h-xl mb-3">Đánh giá từ người dùng</h1>
        <p className="text-on-surface-variant">
          {stats.count} lượt đánh giá đã thu thập.
        </p>
      </header>

      {/* Điểm trung bình */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <div className="glass-card rounded-card p-5">
          <p className="text-xs text-on-surface-variant mb-2">Tổng số đánh giá</p>
          <span className="font-display text-3xl font-semibold text-primary">{stats.count}</span>
        </div>
        <StatCard label="Sự tiện lợi" value={stats.convenience} />
        <StatCard label="Nội dung" value={stats.content} />
        <StatCard label="Tổng quan" value={stats.overall} />
      </div>

      {/* Danh sách */}
      {loading ? (
        <p className="text-on-surface-variant">Đang tải…</p>
      ) : err ? (
        <p className="text-error glass-card rounded-card p-6">Lỗi tải dữ liệu: {err}</p>
      ) : rows.length === 0 ? (
        <p className="text-on-surface-variant glass-card rounded-card p-8 text-center">
          Chưa có đánh giá nào.
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.id} className="glass-card rounded-card p-5">
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
                  {new Date(r.created_at).toLocaleString('vi-VN')}
                </span>
              </div>
              {r.comment && (
                <p className="text-sm text-on-surface leading-relaxed border-l-2 border-primary/40 pl-3">
                  {r.comment}
                </p>
              )}
              {r.page_path && (
                <p className="text-xs text-on-surface-variant/70 mt-2">Trang: {r.page_path}</p>
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
