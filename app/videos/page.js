'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchContent } from '@/lib/content';
import ContentCard from '../components/ContentCard';

export default function VideosPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent('video').then(({ data }) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  const groups = useMemo(() => {
    const map = {};
    items.forEach((i) => {
      const k = i.category || 'Other';
      (map[k] = map[k] || []).push(i);
    });
    return map;
  }, [items]);

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
            Immersive visual explorations of real-world applications. Deep dive into complex
            systems, told through cinematic clarity.
          </p>
        </div>
        <a href="/upload" className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-lg text-sm font-bold hover:scale-95 transition-transform whitespace-nowrap">
          <span className="material-symbols-outlined text-base">upload</span> Upload Video
        </a>
      </header>

      {loading ? (
        <p className="text-on-surface-variant">Loading…</p>
      ) : (
        Object.entries(groups).map(([cat, vids]) => (
          <section key={cat} className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="h-md">{cat}</h2>
              <span className="label-sm text-on-surface-variant">{vids.length} videos</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {vids.map((item, i) => (
                <ContentCard key={item.id} item={item} index={i} video />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
