'use client';

// v16: hearts on student case studies
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchContent } from '@/lib/content';
import { fetchHeartMap } from '@/lib/hearts';
import HeartButton from '../components/HeartButton';
import CityPage from '../components/city/CityPage';

const FRAME_GRADS = [
  'from-[#2f6b6a] to-[#12302f]',
  'from-[#8a3e5a] to-[#2b1424]',
  'from-[#8a6a2a] to-[#2b200f]',
  'from-[#3e4a8a] to-[#141a35]',
];

export default function StudentsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [hearts, setHearts] = useState({});

  useEffect(() => {
    fetchContent('student').then(({ data }) => {
      setItems(data);
      setLoading(false);
      fetchHeartMap('content', data.map((i) => i.id)).then(setHearts);
    });
  }, []);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(items.map((i) => i.category).filter(Boolean)))],
    [items]
  );
  const featured = items.find((i) => i.tags?.includes('featured')) || items[0];

  const filtered = items.filter((i) => {
    const okCat = filter === 'All' || i.category === filter;
    const q = query.toLowerCase();
    const okQ = !q || i.title.toLowerCase().includes(q) || i.summary?.toLowerCase().includes(q);
    return okCat && okQ;
  });

  return (
    <CityPage
      place="students"
      title="Student Case Studies"
      subtitle="An exhibition of student work. Stand in front of a piece, think about it first, then step inside to see the insight, the idea and the execution."
    >
      {loading ? (
        <p className="text-on-surface-variant">Loading…</p>
      ) : (
        <>
          {featured && (
            <Link href={`/students/${featured.id}`} className="mb-12 glass-card pulse-hover rounded-card overflow-hidden grid md:grid-cols-2">
              <div className="relative min-h-[240px] bg-gradient-to-br from-[#2a1f3a] to-[#0e0d16] flex items-center justify-center">
                {featured.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={featured.cover_url} alt={featured.title} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-6xl text-primary opacity-40">workspace_premium</span>
                )}
              </div>
              <div className="p-8 md:p-10 flex flex-col justify-center gap-4">
                <span className="label-sm text-secondary">Exhibit of the week{featured.category ? ` · ${featured.category}` : ''}</span>
                <h2 className="h-lg">{featured.title}</h2>
                <p className="text-on-surface-variant leading-relaxed">{featured.summary}</p>
                <span className="text-sm text-primary font-bold flex items-center gap-1">Step inside <span className="material-symbols-outlined text-base">arrow_forward</span></span>
              </div>
            </Link>
          )}

          {/* Filters */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
            <div className="flex flex-wrap gap-2">
              <span className="kw-label self-center mr-1">Rooms</span>
              {categories.map((c) => (
                <button key={c} onClick={() => setFilter(c)} className={`kw-chip ${filter === c ? 'is-on' : ''}`}>
                  {c === 'All' ? 'All rooms' : c}
                </button>
              ))}
            </div>
            <div className="md:ml-auto relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects…"
                className="bg-surface-container-lowest border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm w-full md:w-64 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10 pt-4">
            {filtered.map((item, i) => {
              const authors = Array.isArray(item.authors) ? item.authors.filter((a) => a && a.name).map((a) => a.name) : [];
              return (
                <div key={item.id} className="kw-exhibit">
                  <Link href={`/students/${item.id}`} className="group block">
                    <div className="kw-frame transition-transform group-hover:-translate-y-0.5">
                      <div className={`relative aspect-[4/3] overflow-hidden rounded-[2px] bg-gradient-to-br ${FRAME_GRADS[i % FRAME_GRADS.length]}`}>
                        {item.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.cover_url} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <span className="absolute inset-0 grid place-items-center material-symbols-outlined text-5xl text-white/40">auto_awesome</span>
                        )}
                      </div>
                    </div>
                    <div className="kw-plaque">
                      <span className="font-display text-[14px] font-semibold leading-snug line-clamp-2">{item.title}</span>
                      <span className="text-[11.5px] text-[#4b445c] line-clamp-1">
                        {[item.category, authors.join(', ')].filter(Boolean).join(' · ') || 'Student work'}
                      </span>
                    </div>
                  </Link>
                  <HeartButton
                    type="content"
                    id={item.id}
                    data={hearts[item.id]}
                    size="sm"
                    className="absolute top-[42px] right-4 z-10 bg-background/70 backdrop-blur-sm"
                  />
                </div>
              );
            })}
          </div>
          {items.length === 0 ? (
            <p className="text-on-surface-variant glass-card rounded-card p-8 text-center">
              No student case studies yet. Submit the first one from the dashboard.
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-on-surface-variant py-12 text-center">No projects match your search.</p>
          ) : null}

          <section className="mt-24 glass-card rounded-card p-10 text-center">
            <h2 className="h-md mb-3">Inspired by these projects?</h2>
            <p className="text-on-surface-variant mb-6 max-w-xl mx-auto">
              Join our community of researchers and share your own case study with the universe.
            </p>
            <a href="/upload" className="inline-block bg-primary text-on-primary px-7 py-3 rounded-lg text-sm font-bold hover:scale-95 transition-transform">
              Submit Your Work
            </a>
          </section>
        </>
      )}
    </CityPage>
  );
}
