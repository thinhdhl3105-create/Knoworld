'use client';

import { useEffect, useState } from 'react';
import { fetchContent } from '@/lib/content';
import ContentCard from '../components/ContentCard';
import RequireAuth from '../components/RequireAuth';

function ResearchPageInner() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    fetchContent('research').then(({ data }) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  const foundations = items.filter((i) => i.is_foundation);
  const papers = items.filter((i) => !i.is_foundation);
  const featured = papers.find((i) => i.tags?.includes('featured')) || papers[0];
  const rest = papers.filter((i) => i.id !== featured?.id);
  const open = items.find((i) => i.id === openId);

  return (
    <div className="pt-32 pb-24 max-w-container mx-auto px-5 md:px-16">
      <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="h-px w-12 bg-primary" />
            <span className="label-sm text-secondary tracking-widest">Scientific Archives</span>
          </div>
          <h1 className="h-xl mb-6">Research Archive</h1>
          <p className="text-lg text-on-surface-variant max-w-2xl leading-relaxed">
            Ongoing research updates, downloadable papers, and the editable theoretical
            foundations that underpin every framework and case study.
          </p>
        </div>
        <a href="/upload" className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-lg text-sm font-bold hover:scale-95 transition-transform whitespace-nowrap">
          <span className="material-symbols-outlined text-base">upload</span> Upload Research
        </a>
      </header>

      {loading ? (
        <p className="text-on-surface-variant">Loading constellations…</p>
      ) : (
        <>
          {featured && (
            <section className="mb-20">
              <div className="glass-card pulse-hover rounded-card overflow-hidden grid md:grid-cols-2">
                <div className="relative aspect-video md:aspect-auto bg-gradient-to-br from-[#0b1c3a] to-[#0e0d16] min-h-[260px]">
                  {featured.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={featured.cover_url} alt={featured.title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center opacity-40">
                      <span className="material-symbols-outlined text-6xl text-primary">hub</span>
                    </div>
                  )}
                </div>
                <div className="p-8 md:p-10 flex flex-col justify-center gap-4">
                  <span className="label-sm text-secondary">Featured · {featured.category || 'Research'}</span>
                  <h2 className="h-lg">{featured.title}</h2>
                  <p className="text-on-surface-variant leading-relaxed">{featured.summary}</p>
                  <div className="flex flex-wrap gap-3 mt-2">
                    <button onClick={() => setOpenId(featured.id)} className="text-sm text-primary font-bold flex items-center gap-1 hover:gap-2 transition-all">
                      Read summary <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </button>
                    {featured.paper_url && (
                      <a href={featured.paper_url} target="_blank" rel="noreferrer" className="text-sm text-secondary font-bold flex items-center gap-1 hover:gap-2 transition-all">
                        Download paper <span className="material-symbols-outlined text-base">download</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="mb-20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="h-md">Current Explorations</h2>
              <span className="label-sm text-on-surface-variant">{rest.length} entries</span>
            </div>
            {rest.length === 0 ? (
              <p className="text-on-surface-variant glass-card rounded-card p-8 text-center">
                No research papers yet. Use “Upload Research” to publish the first one.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {rest.map((item, i) => (
                  <div key={item.id} role="button" tabIndex={0} onClick={() => setOpenId(item.id)}
                    onKeyDown={(e) => e.key === 'Enter' && setOpenId(item.id)} className="text-left cursor-pointer">
                    <ContentCard item={item} index={i} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="h-md">Theoretical Foundations</h2>
              <span className="label-sm text-on-surface-variant">{foundations.length} concepts</span>
            </div>
            <p className="text-sm text-on-surface-variant mb-6 max-w-2xl">
              A living set of core theories. Add, edit, or expand them anytime from the dashboard
              (mark a research entry as a Theoretical Foundation).
            </p>
            {foundations.length === 0 ? (
              <p className="text-on-surface-variant">No foundations yet.</p>
            ) : (
              <div className="divide-y divide-white/10 border-t border-white/10">
                {foundations.map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setOpenId(item.id)}
                    onKeyDown={(e) => e.key === 'Enter' && setOpenId(item.id)}
                    className="w-full text-left py-6 flex items-center justify-between gap-6 group cursor-pointer"
                  >
                    <div>
                      <h3 className="font-display text-base font-medium group-hover:text-primary transition-colors">{item.title}</h3>
                      <p className="text-sm text-on-surface-variant mt-1 line-clamp-1">{item.summary}</p>
                    </div>
                    <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">arrow_outward</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Reader modal */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setOpenId(null)}>
          <div className="glass-card rounded-card max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8 md:p-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className="label-sm text-secondary">
                  {open.is_foundation ? 'Theoretical Foundation' : 'Research'}{open.category ? ` · ${open.category}` : ''}
                </span>
                <h2 className="h-lg mt-1">{open.title}</h2>
              </div>
              <button onClick={() => setOpenId(null)} className="material-symbols-outlined text-on-surface-variant hover:text-primary">close</button>
            </div>
            {open.summary && <p className="text-on-surface-variant leading-relaxed mb-4">{open.summary}</p>}
            {open.body && <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{open.body}</p>}
            {open.paper_url && (
              <a href={open.paper_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-6 bg-primary text-on-primary px-5 py-2.5 rounded-lg text-sm font-bold">
                <span className="material-symbols-outlined text-base">download</span> Download paper
              </a>
            )}
            {open.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6">
                {open.tags.map((t) => (
                  <span key={t} className="text-[11px] px-2 py-0.5 rounded border border-secondary/40 text-secondary bg-secondary/5">{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResearchPage() {
  return (
    <RequireAuth>
      <ResearchPageInner />
    </RequireAuth>
  );
}
