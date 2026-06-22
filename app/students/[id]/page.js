'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchContentById } from '@/lib/content';

const sections = [
  { key: 'context', label: 'Context', icon: 'public' },
  { key: 'insight', label: 'Insight', icon: 'lightbulb' },
  { key: 'creative_approach', label: 'Creative Approach', icon: 'palette' },
  { key: 'execution', label: 'Execution', icon: 'rocket_launch' },
];

export default function StudentCaseDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    fetchContentById(id).then(({ data }) => {
      setItem(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="pt-32 px-5 max-w-container mx-auto text-on-surface-variant">Loading…</div>;
  if (!item) {
    return (
      <div className="pt-32 pb-24 max-w-container mx-auto px-5 md:px-16">
        <p className="text-on-surface-variant">Case study not found.</p>
        <Link href="/students" className="text-primary text-sm mt-4 inline-block">← Back to case studies</Link>
      </div>
    );
  }

  const images = item.images || [];

  return (
    <div className="pt-32 pb-24 max-w-container mx-auto px-5 md:px-16">
      <Link href="/students" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary mb-8">
        <span className="material-symbols-outlined text-base">arrow_back</span> Case Studies
      </Link>

      <header className="mb-10">
        <span className="label-sm text-secondary tracking-widest">{item.category || 'Student Case Study'}</span>
        <h1 className="h-xl mt-2 mb-4">{item.title}</h1>
        {item.summary && <p className="text-lg text-on-surface-variant max-w-3xl leading-relaxed">{item.summary}</p>}
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-5">
            {item.tags.map((t) => (
              <span key={t} className="text-[11px] px-2 py-0.5 rounded border border-secondary/40 text-secondary bg-secondary/5">{t}</span>
            ))}
          </div>
        )}
      </header>

      {item.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.cover_url} alt={item.title} className="w-full rounded-card mb-12 max-h-[420px] object-cover border border-white/10" />
      )}

      <div className="flex flex-col gap-8 max-w-3xl">
        {sections.map((s) =>
          item[s.key] ? (
            <section key={s.key} className="glass-card rounded-card p-7">
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-outlined text-primary">{s.icon}</span>
                <h2 className="font-display text-xl font-medium">{s.label}</h2>
              </div>
              <p className="text-on-surface leading-relaxed whitespace-pre-wrap">{item[s.key]}</p>
            </section>
          ) : null
        )}
        {item.body && !sections.some((s) => item[s.key]) && (
          <section className="glass-card rounded-card p-7">
            <p className="text-on-surface leading-relaxed whitespace-pre-wrap">{item.body}</p>
          </section>
        )}
      </div>

      {images.length > 0 && (
        <section className="mt-14">
          <h2 className="h-md mb-6">Visuals from the project</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((src, i) => (
              <button key={i} onClick={() => setLightbox(src)} className="rounded-card overflow-hidden border border-white/10 aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`${item.title} visual ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
              </button>
            ))}
          </div>
        </section>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="visual" className="max-w-full max-h-[90vh] rounded-lg" />
        </div>
      )}
    </div>
  );
}
