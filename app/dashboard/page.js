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
import { fetchViewStats } from '@/lib/views';
import { fetchHeartMap } from '@/lib/hearts';
import CityPage from '../components/city/CityPage';
import ClassStats from '../components/ClassStats';
import { useAuth } from '../components/AuthProvider';

const ADMIN_EMAIL = 'thinh.dhl3105@gmail.com';

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: null, label: 'All time' },
];

function contentHref(x) {
  if (x.kind === 'video') return `/videos?v=${x.id}`;
  if (x.kind === 'image') return `/images?i=${x.id}`;
  return `/students/${x.id}`;
}

function DashboardInner() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [research, setResearch] = useState([]);
  const [videos, setVideos] = useState([]);
  const [students, setStudents] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [flinks, setFlinks] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  // v22: Most viewed
  const [range, setRange] = useState(30);
  const [viewStats, setViewStats] = useState({});
  const [viewsError, setViewsError] = useState('');
  const [viewsLoading, setViewsLoading] = useState(true);
  const [hearts, setHearts] = useState({});

  useEffect(() => {
    Promise.all([
      fetchContent('research'),
      fetchContent('video'),
      fetchContent('student'),
      fetchConcepts(),
      fetchFrameworks(),
      fetchFoundationLinks(),
      fetchContent('image'),
    ]).then(([r, v, s, c, f, fl, im]) => {
      setImages(im.data);
      const ids = [...v.data, ...s.data, ...im.data].map((x) => x.id);
      fetchHeartMap('content', ids).then(setHearts);
      setResearch(r.data);
      setVideos(v.data);
      setStudents(s.data);
      setConcepts(c.data);
      setFrameworks(f.data);
      setFlinks(fl.data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setViewsLoading(true);
    fetchViewStats(range).then(({ data, error }) => {
      setViewStats(data);
      setViewsError(error || '');
      setViewsLoading(false);
    });
  }, [range]);

  // v22: xếp hạng theo lượt xem (cùng số lượt xem -> nhiều tim hơn đứng trước).
  const rankBy = (arr) =>
    arr
      .map((x) => ({
        ...x,
        _views: viewStats[x.id]?.views || 0,
        _viewers: viewStats[x.id]?.viewers || 0,
        _hearts: hearts[x.id]?.count || 0,
      }))
      .filter((x) => x._views > 0)
      .sort((a, b) => b._views - a._views || b._hearts - a._hearts)
      .slice(0, 5);
  const topVideos = useMemo(() => rankBy(videos), [videos, viewStats, hearts]); // eslint-disable-line react-hooks/exhaustive-deps
  const topCases = useMemo(
    () => rankBy([...students.map((x) => ({ ...x, kind: x.kind || 'student' })), ...images]),
    [students, images, viewStats, hearts] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const mostHearted = useMemo(
    () =>
      [...videos, ...students, ...images]
        .map((x) => ({ ...x, _hearts: hearts[x.id]?.count || 0 }))
        .filter((x) => x._hearts > 0)
        .sort((a, b) => b._hearts - a._hearts)
        .slice(0, 5),
    [videos, students, images, hearts]
  );
  const totalViews = useMemo(
    () => Object.values(viewStats).reduce((s, v) => s + v.views, 0),
    [viewStats]
  );

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

  const caseStudies = videos.length + students.length + images.length;
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
<CityPage
      place="dashboard"
      title="Dashboard"
      subtitle="City Hall's live overview of the knowledge base — what's been built, how it connects, and where the gaps are."
      actions={(
        <Link href="/upload" className="kw-pill is-accent">
          <span className="material-symbols-outlined text-base">add</span>Add entry
        </Link>
      )}
    >

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

          {/* v43: Classes by school (chỉ admin) */}
          {isAdmin && <ClassStats showIslandLink />}

          {/* v22: Most viewed */}
          <section className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
              <div>
                <h2 className="h-md">Most viewed</h2>
                <p className="text-xs text-on-surface-variant mt-1">
                  {viewsLoading
                    ? 'Loading views…'
                    : `${totalViews} views in this period · one view per visitor per item per day`}
                </p>
              </div>
              <div className="flex gap-2">
                {RANGES.map((r) => (
                  <button
                    key={r.label}
                    onClick={() => setRange(r.days)}
                    className={
                      range === r.days
                        ? 'px-4 py-1.5 rounded-full text-xs bg-primary text-on-primary font-bold'
                        : 'px-4 py-1.5 rounded-full text-xs border border-white/10 text-on-surface-variant hover:border-primary/50 transition-colors'
                    }
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            {viewsError && (
              <p className="text-xs text-error mb-3">
                View stats are not available yet (run migration_v22 in Supabase).
              </p>
            )}
            <div className="grid lg:grid-cols-3 gap-6">
              <TopList title="Top videos" icon="smart_display" items={topVideos} showViews
                empty="No video views recorded in this period yet." />
              <TopList title="Top case studies" icon="menu_book" items={topCases} showViews
                empty="No case study views recorded in this period yet." />
              <TopList title="Most hearted" icon="favorite" items={mostHearted}
                empty="No hearts yet." />
            </div>
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
    </CityPage>
  );
}

const KIND_LABEL = { video: 'Video', image: 'Image case', student: 'Student case' };

function TopList({ title, icon, items, showViews, empty }) {
  const max = Math.max(1, ...items.map((x) => (showViews ? x._views : x._hearts)));
  return (
    <section className="glass-card rounded-card p-6">
      <h3 className="font-display text-base font-medium mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-xl">{icon}</span>
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-on-surface-variant">{empty}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {items.map((x, i) => {
            const val = showViews ? x._views : x._hearts;
            return (
              <li key={x.id}>
                <Link href={contentHref(x)} className="group block">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-on-surface-variant tabular-nums w-4">{i + 1}</span>
                    <span className="text-sm font-medium truncate flex-1 group-hover:text-primary transition-colors" title={x.title}>
                      {x.title}
                    </span>
                    <span className="text-sm tabular-nums">{val}</span>
                  </div>
                  <div className="ml-6 mt-1.5 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(val / max) * 100}%` }} />
                  </div>
                  <p className="ml-6 mt-1 text-[11px] text-on-surface-variant">
                    {KIND_LABEL[x.kind] || 'Case'}
                    {showViews ? ` · ${x._viewers} viewer${x._viewers === 1 ? '' : 's'} · ${x._hearts} ♥` : ' · hearts'}
                  </p>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
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
