'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  fetchContent,
  fetchConcepts,
  fetchFrameworks,
  fetchFoundationLinks,
} from '@/lib/content';
import RequireAuth from '../components/RequireAuth';

function DashboardInner() {
  const [research, setResearch] = useState([]);
  const [videos, setVideos] = useState([]);
  const [students, setStudents] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [flinks, setFlinks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchContent('research'),
      fetchContent('video'),
      fetchContent('student'),
      fetchConcepts(),
      fetchFrameworks(),
      fetchFoundationLinks(),
    ]).then(([r, v, s, c, f, fl]) => {
      setResearch(r.data);
      setVideos(v.data);
      setStudents(s.data);
      setConcepts(c.data);
      setFrameworks(f.data);
      setFlinks(fl.data);
      setLoading(false);
    });
  }, []);

  const foundations = useMemo(() => research.filter((r) => r.is_foundation), [research]);
  const papers = useMemo(() => research.filter((r) => !r.is_foundation), [research]);

  // Coverage: how many foundations have ≥1 linked research paper.
  const researchPerFoundation = useMemo(() => {
    const counts = new Map(foundations.map((f) => [f.id, 0]));
    flinks.forEach((l) => {
      if (counts.has(l.foundation_id)) counts.set(l.foundation_id, counts.get(l.foundation_id) + 1);
    });
    return foundations
      .map((f) => ({ id: f.id, title: f.title, count: counts.get(f.id) || 0 }))
      .sort((a, b) => b.count - a.count);
  }, [foundations, flinks]);

  const covered = researchPerFoundation.filter((f) => f.count > 0).length;
  const coveragePct = foundations.length ? Math.round((covered / foundations.length) * 100) : 0;
  const gaps = researchPerFoundation.filter((f) => f.count === 0);
  const linkedResearchIds = useMemo(() => new Set(flinks.map((l) => l.research_id)), [flinks]);
  const orphanPapers = papers.filter((p) => !linkedResearchIds.has(p.id)).length;

  // Category breakdown across all content.
  const categoryBreakdown = useMemo(() => {
    const m = new Map();
    [...research, ...videos, ...students, ...frameworks].forEach((x) => {
      const cat = (x.category || 'Uncategorized').trim() || 'Uncategorized';
      m.set(cat, (m.get(cat) || 0) + 1);
    });
    return Array.from(m.entries()).map(([cat, n]) => ({ cat, n })).sort((a, b) => b.n - a.n).slice(0, 8);
  }, [research, videos, students, frameworks]);

  // Top tags.
  const topTags = useMemo(() => {
    const m = new Map();
    [...research, ...videos, ...students, ...concepts, ...frameworks].forEach((x) =>
      (x.tags || []).forEach((t) => m.set(t, (m.get(t) || 0) + 1))
    );
    return Array.from(m.entries()).map(([tag, n]) => ({ tag, n })).sort((a, b) => b.n - a.n).slice(0, 14);
  }, [research, videos, students, concepts, frameworks]);

  // Recent activity across everything.
  const recent = useMemo(() => {
    const tag = (arr, kind) => arr.map((x) => ({ ...x, _kind: kind }));
    return [
      ...tag(foundations, 'Foundation'),
      ...tag(papers, 'Research'),
      ...tag(videos, 'Video'),
      ...tag(students, 'Student'),
      ...tag(concepts, 'Concept'),
      ...tag(frameworks, 'Framework'),
    ]
      .filter((x) => x.created_at)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8);
  }, [foundations, papers, videos, students, concepts, frameworks]);

  const caseStudies = videos.length + students.length;
  const maxRpf = Math.max(1, ...researchPerFoundation.map((f) => f.count));
  const maxCat = Math.max(1, ...categoryBreakdown.map((c) => c.n));

  const cards = [
    { label: 'Foundations', value: foundations.length, icon: 'account_tree', href: '/research' },
    { label: 'Research papers', value: papers.length, icon: 'description', href: '/research' },
    { label: 'Map connections', value: flinks.length, icon: 'hub', href: '/research' },
    { label: 'Concepts', value: concepts.length, icon: 'lightbulb', href: '/knowledge-hub' },
    { label: 'Case studies', value: caseStudies, icon: 'menu_book', href: '/students' },
    { label: 'Frameworks', value: frameworks.length, icon: 'dashboard_customize', href: '/knowledge-hub' },
  ];

  return (
    <div className="pt-32 pb-24 max-w-container mx-auto px-5 md:px-16">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="h-px w-12 bg-primary" />
            <span className="label-sm text-secondary tracking-widest">Knowledge Analytics</span>
          </div>
          <h1 className="h-xl mb-4">Dashboard</h1>
          <p className="text-lg text-on-surface-variant max-w-2xl leading-relaxed">
            A live overview of your knowledge base — what you’ve built, how it connects, and where the gaps are.
          </p>
        </div>
        <Link href="/upload" className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-lg text-sm font-bold hover:scale-95 transition-transform whitespace-nowrap">
          <span className="material-symbols-outlined text-base">add</span> Add entry
        </Link>
      </header>

      {loading ? (
        <p className="text-on-surface-variant">Crunching the numbers…</p>
      ) : (
        <>
          {/* Stat cards */}
          <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
            {cards.map((c) => (
              <Link key={c.label} href={c.href} className="glass-card rounded-card p-5 hover:scale-[0.98] transition-transform">
                <span className="material-symbols-outlined text-primary text-2xl">{c.icon}</span>
                <p className="text-3xl font-display font-semibold mt-2">{c.value}</p>
                <p className="label-sm text-on-surface-variant mt-1">{c.label}</p>
              </Link>
            ))}
          </section>

          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            {/* Coverage donut */}
            <section className="glass-card rounded-card p-6">
              <h2 className="h-md mb-1">Foundation coverage</h2>
              <p className="text-xs text-on-surface-variant mb-4">Foundations backed by ≥1 research paper.</p>
              <div className="flex items-center gap-6">
                <Donut pct={coveragePct} />
                <div className="text-sm text-on-surface-variant space-y-1">
                  <p><strong className="text-on-surface text-lg">{covered}</strong> / {foundations.length} covered</p>
                  <p className="text-secondary">{gaps.length} need research</p>
                  <p className="text-on-surface-variant">{orphanPapers} unlinked papers</p>
                </div>
              </div>
            </section>

            {/* Research per foundation */}
            <section className="glass-card rounded-card p-6 lg:col-span-2">
              <h2 className="h-md mb-4">Research per foundation</h2>
              {researchPerFoundation.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No foundations yet — add one from the dashboard.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {researchPerFoundation.slice(0, 8).map((f) => (
                    <div key={f.id} className="flex items-center gap-3">
                      <span className="text-sm w-40 shrink-0 truncate text-on-surface-variant" title={f.title}>{f.title}</span>
                      <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(f.count / maxRpf) * 100}%` }} />
                      </div>
                      <span className="text-sm w-6 text-right tabular-nums">{f.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            {/* Category breakdown */}
            <section className="glass-card rounded-card p-6 lg:col-span-2">
              <h2 className="h-md mb-4">Content by category</h2>
              {categoryBreakdown.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No content yet.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {categoryBreakdown.map((c) => (
                    <div key={c.cat} className="flex items-center gap-3">
                      <span className="text-sm w-40 shrink-0 truncate text-on-surface-variant" title={c.cat}>{c.cat}</span>
                      <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-secondary" style={{ width: `${(c.n / maxCat) * 100}%` }} />
                      </div>
                      <span className="text-sm w-6 text-right tabular-nums">{c.n}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Top tags */}
            <section className="glass-card rounded-card p-6">
              <h2 className="h-md mb-4">Top tags</h2>
              {topTags.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No tags yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {topTags.map((t) => (
                    <span key={t.tag} className="text-xs px-2.5 py-1 rounded-full border border-secondary/40 text-secondary bg-secondary/5">
                      {t.tag} <span className="text-on-surface-variant">{t.n}</span>
                    </span>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Coverage gaps */}
            <section className="glass-card rounded-card p-6">
              <h2 className="h-md mb-1">Coverage gaps</h2>
              <p className="text-xs text-on-surface-variant mb-4">Foundations with no linked research — your to-do list.</p>
              {gaps.length === 0 ? (
                <p className="text-sm text-secondary">Every foundation is backed by research. 🎉</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {gaps.slice(0, 8).map((g) => (
                    <Link key={g.id} href="/upload" className="text-sm px-3 py-2 rounded-lg border border-white/10 hover:border-primary/50 transition-colors">
                      {g.title}
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Recent activity */}
            <section className="glass-card rounded-card p-6 lg:col-span-2">
              <h2 className="h-md mb-4">Recent activity</h2>
              {recent.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Nothing published yet.</p>
              ) : (
                <div className="divide-y divide-white/10">
                  {recent.map((r) => (
                    <div key={`${r._kind}-${r.id}`} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <span className="label-sm text-secondary">{r._kind}</span>
                        <p className="text-sm font-medium truncate">{r.title}</p>
                      </div>
                      <span className="text-xs text-on-surface-variant whitespace-nowrap">{fmtDate(r.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function Donut({ pct }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  return (
    <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-primary, #c6bfff)" strokeWidth="10"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" transform="rotate(-90 50 50)" />
      <text x="50" y="50" textAnchor="middle" dy="0.35em" fontSize="20" fontWeight="700" fill="#e8e6f5">{pct}%</text>
    </svg>
  );
}

function fmtDate(s) {
  try {
    return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardInner />
    </RequireAuth>
  );
}
