'use client';

// v16: hearts on student case studies
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchContent } from '@/lib/content';
import { fetchHeartMap } from '@/lib/hearts';
import ContentCard from '../components/ContentCard';
import HeartButton from '../components/HeartButton';

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
    <div className="pt-32 pb-24 max-w-container mx-auto px-5 md:px-16">
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="h-px w-12 bg-primary" />
          <span className="label-sm text-secondary tracking-widest">Academic Excellence</span>
        </div>
        <h1 className="h-xl mb-6">Student Case Studies</h1>
        <p className="text-lg text-on-surface-variant max-w-2xl leading-relaxed">
          A curated showcase of validated projects from our leading student community.
        </p>
      </header>

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
                <span className="label-sm text-secondary">Spotlight · {featured.category}</span>
                <h2 className="h-lg">{featured.title}</h2>
                <p className="text-on-surface-variant leading-relaxed">{featured.summary}</p>
                <span className="text-sm text-primary font-bold flex items-center gap-1">View case study <span className="material-symbols-outlined text-base">arrow_forward</span></span>
              </div>
            </Link>
          )}

          {/* Filters */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setFilter(c)}
                  className={
                    filter === c
                      ? 'px-4 py-1.5 rounded-full text-sm bg-primary text-on-primary font-bold'
                      : 'px-4 py-1.5 rounded-full text-sm border border-white/10 text-on-surface-variant hover:border-primary/50 transition-colors'
                  }
                >
                  {c}
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

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((item, i) => (
              <div key={item.id} className="relative">
                <Link href={`/students/${item.id}`}>
                  <ContentCard item={item} index={i} />
                </Link>
                <HeartButton
                  type="content"
                  id={item.id}
                  data={hearts[item.id]}
                  size="sm"
                  className="absolute top-3 right-3 z-10 bg-background/70 backdrop-blur-sm"
                />
              </div>
            ))}
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
    </div>
  );
}
