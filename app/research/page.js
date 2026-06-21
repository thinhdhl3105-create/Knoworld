'use client';

import { useEffect, useState } from 'react';
import { fetchContent } from '@/lib/content';
import ContentCard from '../components/ContentCard';

export default function ResearchPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent('research').then(({ data }) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  const featured = items.find((i) => i.tags?.includes('featured')) || items[0];
  const rest = items.filter((i) => i.id !== featured?.id);

  return (
    <div className="pt-32 pb-24 max-w-container mx-auto px-5 md:px-16">
      <header className="mb-16">
        <div className="flex items-center gap-3 mb-4">
          <span className="h-px w-12 bg-primary" />
          <span className="label-sm text-secondary tracking-widest">Scientific Archives</span>
        </div>
        <h1 className="h-xl mb-6">Research Archives</h1>
        <p className="text-lg text-on-surface-variant max-w-2xl leading-relaxed">
          Ongoing research updates, theoretical frameworks, and core conceptual foundations.
          Bridging the gap between empirical discovery and conceptual mapping.
        </p>
      </header>

      {loading ? (
        <p className="text-on-surface-variant">Loading constellations…</p>
      ) : (
        <>
          {featured && (
            <section className="mb-20">
              <div className="glass-card pulse-hover rounded-card overflow-hidden grid md:grid-cols-2">
                <div className="relative aspect-video md:aspect-auto bg-gradient-to-br from-[#0b1c3a] to-[#0e0d16] min-h-[260px]">
                  <div className="absolute inset-0 flex items-center justify-center opacity-40">
                    <span className="material-symbols-outlined text-6xl text-primary">hub</span>
                  </div>
                </div>
                <div className="p-8 md:p-10 flex flex-col justify-center gap-4">
                  <span className="label-sm text-secondary">Featured · {featured.category}</span>
                  <h2 className="h-lg">{featured.title}</h2>
                  <p className="text-on-surface-variant leading-relaxed">{featured.summary}</p>
                  <button className="self-start mt-2 text-sm text-primary font-bold flex items-center gap-1 hover:gap-2 transition-all">
                    Read full paper <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className="mb-20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="h-md">Current Explorations</h2>
              <span className="label-sm text-on-surface-variant">{rest.length} entries</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {rest.map((item, i) => (
                <ContentCard key={item.id} item={item} index={i} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="h-md mb-6">Theoretical Foundations</h2>
            <div className="divide-y divide-white/10 border-t border-white/10">
              {items.map((item) => (
                <div key={item.id} className="py-6 flex items-center justify-between gap-6 group">
                  <div>
                    <h3 className="font-display text-base font-medium group-hover:text-primary transition-colors">{item.title}</h3>
                    <p className="text-sm text-on-surface-variant mt-1 line-clamp-1">{item.summary}</p>
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">arrow_outward</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
