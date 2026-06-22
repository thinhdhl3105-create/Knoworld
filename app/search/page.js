'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { searchAll } from '@/lib/content';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'video', label: 'Videos' },
  { key: 'student', label: 'Student Cases' },
  { key: 'research', label: 'Research' },
  { key: 'concept', label: 'Knowledge' },
];

function hrefFor(item) {
  if (item._kind === 'student') return `/students/${item.id}`;
  return item._meta?.href || '/';
}

function SearchInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get('q') || '';

  const [query, setQuery] = useState(initial);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [submitted, setSubmitted] = useState(initial);

  useEffect(() => {
    const q = params.get('q') || '';
    setQuery(q);
    setSubmitted(q);
    if (!q) {
      setResults([]);
      return;
    }
    setLoading(true);
    searchAll(q).then(({ data }) => {
      setResults(data);
      setLoading(false);
    });
  }, [params]);

  const onSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  };

  const counts = useMemo(() => {
    const c = { all: results.length };
    results.forEach((r) => {
      c[r._kind] = (c[r._kind] || 0) + 1;
    });
    return c;
  }, [results]);

  const shown = filter === 'all' ? results : results.filter((r) => r._kind === filter);

  return (
    <div className="pt-32 pb-24 max-w-container mx-auto px-5 md:px-16">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="h-px w-12 bg-primary" />
          <span className="label-sm text-secondary tracking-widest">Search the universe</span>
        </div>
        <h1 className="h-xl mb-6">Find anything</h1>
        <p className="text-lg text-on-surface-variant max-w-2xl leading-relaxed">
          Search across video case studies, student case studies, research papers and
          Knowledge Hub concepts — all in one place.
        </p>
      </header>

      <form onSubmit={onSubmit} className="mb-8">
        <div className="glass-card rounded-full flex items-center gap-3 px-5 py-3 focus-within:border-primary/50 transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant">search</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try “brand strategy”, “consumer behaviour”, “TVCreate”…"
            className="flex-1 bg-transparent outline-none text-on-surface placeholder:text-on-surface-variant/60 text-base"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="material-symbols-outlined text-on-surface-variant hover:text-primary text-xl">
              close
            </button>
          )}
          <button type="submit" className="bg-primary text-on-primary px-5 py-1.5 rounded-full text-sm font-bold hover:scale-95 transition-transform">
            Search
          </button>
        </div>
      </form>

      {submitted && (
        <div className="flex flex-wrap gap-2 mb-10">
          {FILTERS.map((f) => {
            const n = f.key === 'all' ? counts.all : counts[f.key] || 0;
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={
                  (active
                    ? 'bg-primary text-on-primary '
                    : 'glass-card text-on-surface-variant hover:text-on-surface ') +
                  'px-4 py-1.5 rounded-full text-sm font-medium transition-colors'
                }
              >
                {f.label}
                <span className={(active ? 'text-on-primary/70' : 'text-on-surface-variant/60') + ' ml-2'}>{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <p className="text-on-surface-variant">Searching…</p>
      ) : !submitted ? (
        <p className="text-on-surface-variant glass-card rounded-card p-8 text-center">
          Start typing to search across everything on Knoworld.
        </p>
      ) : shown.length === 0 ? (
        <p className="text-on-surface-variant glass-card rounded-card p-8 text-center">
          No results for “{submitted}”. Try a different keyword.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {shown.map((item) => (
            <Link
              key={`${item._kind}-${item.id}`}
              href={hrefFor(item)}
              className="group glass-card pulse-hover rounded-card overflow-hidden flex flex-col"
            >
              <div className="relative aspect-[16/10] bg-gradient-to-br from-[#1b2a4a] to-[#0e0d16] overflow-hidden">
                {item.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.cover_url} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center opacity-40">
                    <span className="material-symbols-outlined text-5xl text-primary">{item._meta?.icon}</span>
                  </div>
                )}
                <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-background/70 backdrop-blur text-secondary">
                  <span className="material-symbols-outlined text-sm">{item._meta?.icon}</span>
                  {item._meta?.label}
                </span>
              </div>
              <div className="p-6 flex flex-col gap-3 flex-1">
                {item.category && <span className="label-sm text-secondary">{item.category}</span>}
                <h3 className="font-display text-lg font-medium leading-snug group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                {item.summary && (
                  <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-3">{item.summary}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="pt-32 px-5 text-on-surface-variant max-w-container mx-auto">Loading…</div>}>
      <SearchInner />
    </Suspense>
  );
}
