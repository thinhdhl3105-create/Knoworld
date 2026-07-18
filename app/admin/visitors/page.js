'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import RequireAuth from '../../components/RequireAuth';
import { useAuth } from '../../components/AuthProvider';
import { fetchVisitors, setVisitorBlocked, setVisitorFullAccess, peakHour, avgDuration } from '@/lib/visitor';
import { fetchReviews } from '@/lib/reviews';

const ADMIN_EMAIL = 'thinh.dhl3105@gmail.com';

function VisitorsInner() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [rows, setRows] = useState([]);
  const [reviewed, setReviewed] = useState({ ids: new Set(), emails: new Set() });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [fieldFilter, setFieldFilter] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [openKey, setOpenKey] = useState(null); // v21: nhóm đang mở lịch sử

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([fetchVisitors(), fetchReviews()]).then(([vres, rres]) => {
      if (vres.error) setErr(vres.error);
      setRows(vres.data || []);
      const ids = new Set();
      const emails = new Set();
      (rres.data || []).forEach((rv) => {
        if (rv.visitor_id) ids.add(rv.visitor_id);
        if (rv.visitor_email) emails.add((rv.visitor_email || '').toLowerCase());
      });
      setReviewed({ ids, emails });
      setLoading(false);
    });
  }, [isAdmin]);

  const hasReviewedRow = (r) =>
    reviewed.ids.has(r.id) || reviewed.emails.has((r.email || '').toLowerCase());

  // v21: GỘP các lần đăng ký trùng của cùng một người (theo email).
  // Một người xoá localStorage / đổi máy sẽ đăng ký lại -> nhiều dòng.
  // Gộp lại: tổng visits, last visit mới nhất, peak hour & avg time tính trên
  // toàn bộ dữ liệu, Registered là lần đầu tiên. Bấm dòng để xem từng lần.
  const groups = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const key = (r.email || '').trim().toLowerCase() || `id:${r.id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    return Array.from(map.entries()).map(([key, recs]) => {
      // Mới nhất trước — dòng mới nhất là "đại diện" (tên/role cập nhật nhất).
      recs.sort(
        (a, b) =>
          new Date(b.last_visit_at || b.created_at) - new Date(a.last_visit_at || a.created_at)
      );
      const latest = recs[0];
      const hist = Array(24).fill(0);
      let visits = 0;
      let seconds = 0;
      recs.forEach((r) => {
        visits += r.visit_count ?? 1;
        seconds += r.total_active_seconds || 0;
        (r.hour_histogram || []).forEach((v, i) => {
          if (i < 24) hist[i] += v || 0;
        });
      });
      return {
        key,
        recs,
        latest,
        ids: recs.map((r) => r.id),
        full_name: latest.full_name,
        email: latest.email,
        role: latest.role,
        student_id: recs.map((r) => r.student_id).find(Boolean) || null,
        birth_year: recs.map((r) => r.birth_year).find(Boolean) || null,
        field: latest.field || recs.map((r) => r.field).find(Boolean) || null,
        visit_count: visits,
        total_active_seconds: seconds,
        hour_histogram: hist,
        last_visit_at: latest.last_visit_at || latest.created_at,
        first_created_at: recs.reduce(
          (min, r) => (new Date(r.created_at) < new Date(min) ? r.created_at : min),
          recs[0].created_at
        ),
        blocked: recs.every((r) => r.blocked), // chặn = chặn hết mọi bản ghi
        full_access: recs.some((r) => r.full_access),
        reviewedAny: recs.some(hasReviewedRow),
      };
    });
  }, [rows, reviewed]);

  const fields = useMemo(
    () => Array.from(new Set(groups.map((g) => g.field).filter(Boolean))).sort(),
    [groups]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return groups.filter((g) => {
      if (fieldFilter && g.field !== fieldFilter) return false;
      if (!term) return true;
      return (
        (g.full_name || '').toLowerCase().includes(term) ||
        (g.email || '').toLowerCase().includes(term) ||
        (g.student_id || '').toLowerCase().includes(term)
      );
    });
  }, [groups, q, fieldFilter]);

  // Block / Full access áp dụng cho TẤT CẢ bản ghi của người đó.
  async function toggleBlock(g) {
    const next = !g.blocked;
    setBusyId(g.key);
    const results = await Promise.all(g.ids.map((id) => setVisitorBlocked(id, next)));
    setBusyId(null);
    if (results.every((r) => r.ok)) {
      setRows((prev) => prev.map((x) => (g.ids.includes(x.id) ? { ...x, blocked: next } : x)));
    } else {
      alert('Could not update access: ' + (results.find((r) => !r.ok)?.error || 'unknown error'));
    }
  }

  // v18: cho guest (stranger) được xem full như student.
  async function toggleFullAccess(g) {
    const next = !g.full_access;
    setBusyId(g.key);
    const results = await Promise.all(g.ids.map((id) => setVisitorFullAccess(id, next)));
    setBusyId(null);
    if (results.every((r) => r.ok)) {
      setRows((prev) => prev.map((x) => (g.ids.includes(x.id) ? { ...x, full_access: next } : x)));
    } else {
      alert('Could not update access: ' + (results.find((r) => !r.ok)?.error || 'unknown error'));
    }
  }

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
          <Link href="/admin/access" className="ml-auto text-sm text-on-surface-variant hover:text-primary">
            → Student list & guest cases
          </Link>
          <Link href="/admin/reviews" className="text-sm text-on-surface-variant hover:text-primary">
            → View reviews
          </Link>
        </div>
        <h1 className="h-xl mb-3">Visitors</h1>
        <p className="text-on-surface-variant">
          {groups.length} people have registered
          {rows.length > groups.length ? ` (${rows.length} registrations, merged by email)` : ''}.
        </p>
      </header>

      {/* Tổng quan theo lĩnh vực */}
      {fields.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFieldFilter('')}
            className={chip(!fieldFilter)}
          >
            All ({groups.length})
          </button>
          {fields.map((f) => (
            <button key={f} onClick={() => setFieldFilter(f)} className={chip(fieldFilter === f)}>
              {f} ({groups.filter((g) => g.field === f).length})
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
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">MSSV</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Birth year</th>
                  <th className="px-4 py-3 font-medium">Field</th>
                  <th className="px-4 py-3 font-medium text-center">Visits</th>
                  <th className="px-4 py-3 font-medium">Last visit</th>
                  <th className="px-4 py-3 font-medium">Peak hour</th>
                  <th className="px-4 py-3 font-medium">Avg time</th>
                  <th className="px-4 py-3 font-medium text-center">Reviewed</th>
                  <th className="px-4 py-3 font-medium">Registered</th>
                  <th className="px-4 py-3 font-medium text-center">Access</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => {
                  const dur = avgDuration(g.total_active_seconds, g.visit_count);
                  const peak = peakHour(g.hour_histogram);
                  const multi = g.recs.length > 1;
                  const isOpen = openKey === g.key;
                  return (
                    <React.Fragment key={g.key}>
                    <tr
                      onClick={() => multi && setOpenKey(isOpen ? null : g.key)}
                      className={`border-b border-white/5 hover:bg-white/[0.02] ${g.blocked ? 'opacity-50' : ''} ${multi ? 'cursor-pointer' : ''}`}
                    >
                      <td className="px-4 py-3 text-on-surface font-medium">
                        <span className="inline-flex items-center gap-2">
                          {g.full_name}
                          {multi && (
                            <span
                              className="inline-flex items-center gap-0.5 bg-white/8 text-on-surface-variant px-2 py-0.5 rounded-full text-[11px]"
                              title={`${g.recs.length} registrations merged — click to view history`}
                            >
                              ×{g.recs.length}
                              <span className="material-symbols-outlined text-sm leading-none">
                                {isOpen ? 'expand_less' : 'expand_more'}
                              </span>
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {g.role === 'stranger' ? (
                          <span className="inline-block bg-amber-400/15 text-amber-300 px-2.5 py-0.5 rounded-full text-xs">
                            Guest{g.full_access ? ' · full' : ''}
                          </span>
                        ) : (
                          <span className="inline-block bg-emerald-400/15 text-emerald-300 px-2.5 py-0.5 rounded-full text-xs">
                            Student
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{g.student_id || '—'}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{g.email}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{g.birth_year || '—'}</td>
                      <td className="px-4 py-3">
                        {g.field && (
                          <span className="inline-block bg-primary/15 text-primary px-2.5 py-0.5 rounded-full text-xs">
                            {g.field}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-on-surface font-medium">{g.visit_count}</td>
                      <td className="px-4 py-3 text-on-surface-variant/80 whitespace-nowrap">
                        {g.last_visit_at ? new Date(g.last_visit_at).toLocaleString('en-US') : '—'}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{peak || '—'}</td>
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{dur || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {g.reviewedAny ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
                            <span className="material-symbols-outlined text-base">check_circle</span> Yes
                          </span>
                        ) : (
                          <span className="text-on-surface-variant/60 text-xs">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant/80 whitespace-nowrap">
                        {new Date(g.first_created_at).toLocaleString('en-US')}
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          {g.role === 'stranger' && (
                            <button
                              onClick={() => toggleFullAccess(g)}
                              disabled={busyId === g.key}
                              title="Allow this guest to view everything, like a student"
                              className={
                                g.full_access
                                  ? 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/25 transition-colors disabled:opacity-50'
                                  : 'px-3 py-1 rounded-full text-xs font-medium border border-white/10 text-on-surface-variant hover:border-emerald-400/50 hover:text-emerald-300 transition-colors disabled:opacity-50'
                              }
                            >
                              {busyId === g.key ? '…' : g.full_access ? 'Full access ✓' : 'Allow access'}
                            </button>
                          )}
                          <button
                            onClick={() => toggleBlock(g)}
                            disabled={busyId === g.key}
                            className={
                              g.blocked
                                ? 'px-3 py-1 rounded-full text-xs font-bold bg-error/15 text-error hover:bg-error/25 transition-colors disabled:opacity-50'
                                : 'px-3 py-1 rounded-full text-xs font-medium border border-white/10 text-on-surface-variant hover:border-error/50 hover:text-error transition-colors disabled:opacity-50'
                            }
                          >
                            {busyId === g.key ? '…' : g.blocked ? 'Blocked · Unblock' : 'Block'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* v21: lịch sử từng lần đăng ký của người này */}
                    {multi && isOpen && (
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                        <td colSpan={13} className="px-6 py-4">
                          <p className="text-xs text-on-surface-variant mb-2 font-medium">
                            Registration history ({g.recs.length})
                          </p>
                          <div className="flex flex-col gap-1.5">
                            {g.recs.map((r) => {
                              const rdur = avgDuration(r.total_active_seconds, r.visit_count);
                              const rpeak = peakHour(r.hour_histogram);
                              return (
                                <div
                                  key={r.id}
                                  className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-on-surface-variant/80"
                                >
                                  <span className="whitespace-nowrap">
                                    {new Date(r.created_at).toLocaleString('en-US')}
                                  </span>
                                  <span>visits: {r.visit_count ?? 1}</span>
                                  <span>
                                    last: {r.last_visit_at ? new Date(r.last_visit_at).toLocaleString('en-US') : '—'}
                                  </span>
                                  <span>peak: {rpeak || '—'}</span>
                                  <span>avg: {rdur || '—'}</span>
                                  {r.field && <span>field: {r.field}</span>}
                                  {r.blocked && <span className="text-error">blocked</span>}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
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
