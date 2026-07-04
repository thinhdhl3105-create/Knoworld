'use client';

// v17: Image Case Studies — campaign name + brand + related images only.
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchContent } from '@/lib/content';
import { trackContentView } from '@/lib/reviews';
import { fetchHeartMap } from '@/lib/hearts';
import HeartButton from '../components/HeartButton';

const GRADS = ['from-[#1b2a4a]', 'from-[#3a2a4a]', 'from-[#2a3a3a]', 'from-[#3a2a2a]'];

function coverOf(item) {
  return item.cover_url || (Array.isArray(item.images) && item.images[0]) || null;
}

function ImagesPage() {
  const params = useSearchParams();
  const wantId = params.get('i');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [hearts, setHearts] = useState({});

  useEffect(() => {
    fetchContent('image').then(({ data }) => {
      setItems(data);
      setLoading(false);
      fetchHeartMap('content', data.map((i) => i.id)).then(setHearts);
      if (wantId) {
        const match = data.find((i) => String(i.id) === String(wantId));
        if (match) { trackContentView(); setActive(match); }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantId]);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(items.map((i) => i.category).filter(Boolean)))],
    [items]
  );

  const filtered = items.filter((i) => {
    const okCat = filter === 'All' || i.category === filter;
    const q = query.toLowerCase();
    const okQ = !q || i.title.toLowerCase().includes(q) || i.brand?.toLowerCase().includes(q) || i.summary?.toLowerCase().includes(q);
    return okCat && okQ;
  });

  const openCase = (item) => { trackContentView(); setActive(item); };
  const activeImages = active ? (active.images && active.images.length ? active.images : [coverOf(active)].filter(Boolean)) : [];

  return (
    <div className="pt-32 pb-24 max-w-container mx-auto px-5 md:px-16">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="h-px w-12 bg-primary" />
            <span className="label-sm text-secondary tracking-widest">Visual Campaigns</span>
          </div>
          <h1 className="h-xl mb-6">Image Case Studies</h1>
          <p className="text-lg text-on-surface-variant max-w-2xl leading-relaxed">
            Campaigns told through visuals — the campaign name, the brand behind it, and the
            key images that brought it to life.
          </p>
        </div>
        <a href="/upload" className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-lg text-sm font-bold hover:scale-95 transition-transform whitespace-nowrap">
          <span className="material-symbols-outlined text-base">upload</span> Upload Campaign
        </a>
      </header>

      {loading ? (
        <p className="text-on-surface-variant">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-on-surface-variant glass-card rounded-card p-8 text-center">
          No image case studies yet. Add one from the dashboard — choose “Image Case Study”, enter a
          campaign name and brand, then upload the campaign images.
        </p>
      ) : (
        <>
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
                placeholder="Search campaigns…"
                className="bg-surface-container-lowest border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm w-full md:w-64 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((item, i) => {
              const cover = coverOf(item);
              const count = Array.isArray(item.images) ? item.images.length : 0;
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openCase(item)}
                  onKeyDown={(e) => e.key === 'Enter' && openCase(item)}
                  className="group glass-card pulse-hover rounded-card overflow-hidden flex flex-col text-left cursor-pointer relative"
                >
                  <div className={`relative aspect-[16/10] bg-gradient-to-br ${GRADS[i % GRADS.length]} to-[#0e0d16] overflow-hidden`}>
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center opacity-40">
                        <span className="material-symbols-outlined text-5xl text-primary">image</span>
                      </div>
                    )}
                    {count > 1 && (
                      <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-background/70 backdrop-blur text-secondary">
                        <span className="material-symbols-outlined text-sm">photo_library</span> {count}
                      </span>
                    )}
                    <HeartButton
                      type="content"
                      id={item.id}
                      data={hearts[item.id]}
                      size="sm"
                      className="absolute top-3 right-3 z-10 bg-background/70 backdrop-blur-sm"
                    />
                  </div>
                  <div className="p-5 flex flex-col gap-2 flex-1">
                    {item.category && <span className="label-sm text-secondary">{item.category}</span>}
                    <h3 className="font-display text-base font-medium leading-snug group-hover:text-primary transition-colors line-clamp-1">{item.title}</h3>
                    {item.brand && (
                      <span className="inline-flex items-center gap-1 text-xs text-secondary">
                        <span className="material-symbols-outlined text-sm">sell</span> {item.brand}
                      </span>
                    )}
                    {item.summary && <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-2">{item.summary}</p>}
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <p className="text-on-surface-variant py-12 text-center">No campaigns match your search.</p>
          )}
        </>
      )}

      {/* Campaign gallery modal */}
      {active && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setActive(null)}>
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto glass-card rounded-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                {active.category && <span className="label-sm text-secondary">{active.category}</span>}
                <h2 className="font-display text-xl font-medium">{active.title}</h2>
                {active.brand && (
                  <span className="inline-flex items-center gap-1 text-sm text-secondary mt-1">
                    <span className="material-symbols-outlined text-base">sell</span> {active.brand}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <HeartButton type="content" id={active.id} data={hearts[active.id]} />
                <button onClick={() => setActive(null)} className="material-symbols-outlined text-on-surface-variant hover:text-primary">close</button>
              </div>
            </div>
            {active.summary && <p className="text-sm text-on-surface-variant leading-relaxed mb-5">{active.summary}</p>}
            {activeImages.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {activeImages.map((src, i) => (
                  <button key={i} onClick={() => setLightbox(src)} className="rounded-card overflow-hidden border border-white/10 group block w-full self-start">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`${active.title} ${i + 1}`} className="w-full h-auto object-contain group-hover:scale-[1.02] transition-transform" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-on-surface-variant text-sm">No images on this campaign yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Full-screen single image */}
      {lightbox && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="visual" className="max-w-full max-h-[92vh] rounded-lg" />
        </div>
      )}
    </div>
  );
}

export default function ImagesPageWrapper() {
  return (
    <Suspense fallback={<div className="pt-32 px-5 max-w-container mx-auto text-on-surface-variant">Loading…</div>}>
      <ImagesPage />
    </Suspense>
  );
}
