'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchContent, fetchConcepts } from '@/lib/content';

// Normalise a YouTube/Vimeo/file URL into something embeddable.
function toEmbed(url = '') {
  if (!url) return { type: 'none' };
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  if (yt) return { type: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}` };
  if (/vimeo\.com\/(\d+)/.test(url)) return { type: 'iframe', src: `https://player.vimeo.com/video/${url.match(/vimeo\.com\/(\d+)/)[1]}` };
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) return { type: 'file', src: url };
  return { type: 'iframe', src: url };
}

export default function VideosPage() {
  const [items, setItems] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);

  useEffect(() => {
    Promise.all([fetchContent('video'), fetchConcepts()]).then(([v, c]) => {
      setItems(v.data);
      setConcepts(c.data);
      setLoading(false);
    });
  }, []);

  const conceptById = useMemo(() => Object.fromEntries(concepts.map((c) => [c.id, c])), [concepts]);

  const groups = useMemo(() => {
    const map = {};
    items.forEach((i) => {
      const k = i.category || 'Uncategorised';
      (map[k] = map[k] || []).push(i);
    });
    return map;
  }, [items]);

  const player = active ? toEmbed(active.media_url) : null;

  return (
    <div className="pt-32 pb-24 max-w-container mx-auto px-5 md:px-16">
      <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="h-px w-12 bg-primary" />
            <span className="label-sm text-secondary tracking-widest">Visual Learning</span>
          </div>
          <h1 className="h-xl mb-6">Video Case Studies</h1>
          <p className="text-lg text-on-surface-variant max-w-2xl leading-relaxed">
            Video breakdowns — uploaded or linked from YouTube — grouped by category and tied to
            the Knowledge Hub concepts they bring to life.
          </p>
        </div>
        <a href="/upload" className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-lg text-sm font-bold hover:scale-95 transition-transform whitespace-nowrap">
          <span className="material-symbols-outlined text-base">upload</span> Upload Video
        </a>
      </header>

      {loading ? (
        <p className="text-on-surface-variant">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-on-surface-variant glass-card rounded-card p-8 text-center">
          No videos yet. Upload a file or paste a YouTube link from the dashboard to get started.
        </p>
      ) : (
        Object.entries(groups).map(([cat, vids]) => (
          <section key={cat} className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="h-md">{cat}</h2>
              <span className="label-sm text-on-surface-variant">{vids.length} videos</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {vids.map((item, i) => {
                const concept = item.concept_id && conceptById[item.concept_id];
                const grad = ['from-[#1b2a4a]', 'from-[#3a2a4a]', 'from-[#2a3a3a]'][i % 3];
                return (
                  <div key={item.id} role="button" tabIndex={0} onClick={() => setActive(item)}
                    onKeyDown={(e) => e.key === 'Enter' && setActive(item)}
                    className="group glass-card pulse-hover rounded-card overflow-hidden flex flex-col text-left cursor-pointer">
                    <div className={`relative aspect-[16/10] bg-gradient-to-br ${grad} to-[#0e0d16]`}>
                      {item.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.cover_url} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
                      ) : null}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-5xl text-white/90 group-hover:scale-110 transition-transform">play_circle</span>
                      </div>
                    </div>
                    <div className="p-6 flex flex-col gap-3 flex-1">
                      <h3 className="font-display text-lg font-medium leading-snug group-hover:text-primary transition-colors">{item.title}</h3>
                      {item.brand && (
                        <span className="inline-flex items-center gap-1 text-xs text-secondary">
                          <span className="material-symbols-outlined text-sm">sell</span> {item.brand}
                        </span>
                      )}
                      {item.summary && <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-2">{item.summary}</p>}
                      {concept && (
                        <span className="mt-auto inline-flex items-center gap-1 text-xs text-secondary">
                          <span className="material-symbols-outlined text-sm">hub</span> {concept.title}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      {/* Player modal */}
      {active && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setActive(null)}>
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display text-lg font-medium">{active.title}</h2>
                {active.brand && <span className="text-xs text-secondary">{active.brand}</span>}
              </div>
              <button onClick={() => setActive(null)} className="material-symbols-outlined text-on-surface-variant hover:text-primary">close</button>
            </div>
            <div className="aspect-video rounded-card overflow-hidden bg-black">
              {player?.type === 'iframe' ? (
                <iframe src={player.src} title={active.title} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              ) : player?.type === 'file' ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={player.src} controls className="w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-sm">No playable media on this entry.</div>
              )}
            </div>
            {active.summary && <p className="text-sm text-on-surface-variant mt-4 leading-relaxed">{active.summary}</p>}
            {active.concept_id && conceptById[active.concept_id] && (
              <a href="/knowledge-hub" className="inline-flex items-center gap-1 text-sm text-primary mt-3">
                <span className="material-symbols-outlined text-base">hub</span>
                Related concept: {conceptById[active.concept_id].title}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
