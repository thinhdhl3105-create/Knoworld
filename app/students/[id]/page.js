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
  // Sections that actually have content.
  const activeSections = sections.filter((s) => item[s.key]);
  // Pair one image with each section (alternating sides); leftovers go to a gallery.
  const pairedCount = Math.min(activeSections.length, images.length);
  const galleryImages = images.slice(pairedCount);

  const meta = [
    item.student_name && { icon: 'person', value: item.student_name },
    item.school && { icon: 'school', value: item.school },
    item.year && { icon: 'calendar_today', value: item.year },
  ].filter(Boolean);

  return (
    <div className="pt-32 pb-24 max-w-container mx-auto px-5 md:px-16">
      <Link href="/students" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary mb-8">
        <span className="material-symbols-outlined text-base">arrow_back</span> Case Studies
      </Link>

      <header className="mb-12">
        <span className="label-sm text-secondary tracking-widest">{item.category || 'Student Case Study'}</span>
        <h1 className="h-xl mt-2 mb-4">{item.title}</h1>
        {item.summary && <p className="text-lg text-on-surface-variant max-w-3xl leading-relaxed">{item.summary}</p>}

        {meta.length > 0 && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-6">
            {meta.map((m) => (
              <span key={m.icon} className="inline-flex items-center gap-2 text-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-base text-primary">{m.icon}</span>
                {m.value}
              </span>
            ))}
          </div>
        )}

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
        <img src={item.cover_url} alt={item.title} className="w-full rounded-card mb-14 max-h-[460px] object-cover border border-white/10" />
      )}

      {/* Alternating image + text rows */}
      <div className="flex flex-col gap-14">
        {activeSections.map((s, i) => {
          const img = images[i];
          const imageRight = i % 2 === 1;
          return (
            <section key={s.key} className="grid md:grid-cols-2 gap-8 items-center">
              <div className={imageRight ? 'md:order-1' : 'md:order-2'}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="material-symbols-outlined text-primary">{s.icon}</span>
                  <h2 className="font-display text-xl font-medium">{s.label}</h2>
                </div>
                <p className="text-on-surface leading-relaxed whitespace-pre-wrap">{item[s.key]}</p>
              </div>
              {img ? (
                <button
                  onClick={() => setLightbox(img)}
                  className={`${imageRight ? 'md:order-2' : 'md:order-1'} rounded-card overflow-hidden border border-white/10 aspect-[4/3] group`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`${item.title} — ${s.label}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </button>
              ) : (
                <div className="hidden md:block" />
              )}
            </section>
          );
        })}

        {/* Fallback for old entries that only have a body */}
        {item.body && activeSections.length === 0 && (
          <section className="glass-card rounded-card p-7 max-w-3xl">
            <p className="text-on-surface leading-relaxed whitespace-pre-wrap">{item.body}</p>
          </section>
        )}
      </div>

      {/* Remaining visuals as a gallery */}
      {galleryImages.length > 0 && (
        <section className="mt-16">
          <h2 className="h-md mb-6">More visuals from the project</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {galleryImages.map((src, i) => (
              <button key={i} onClick={() => setLightbox(src)} className="rounded-card overflow-hidden border border-white/10 aspect-[4/3] group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`${item.title} visual ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
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