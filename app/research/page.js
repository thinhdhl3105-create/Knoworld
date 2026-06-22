'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchContent, fetchFoundationLinks } from '@/lib/content';
import ContentCard from '../components/ContentCard';
import ConceptGraph from '../components/ConceptGraph';
import RequireAuth from '../components/RequireAuth';

function ResearchPageInner() {
  const [items, setItems] = useState([]);
  const [flinks, setFlinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [tab, setTab] = useState('archive'); // archive | map
  const [mapSelId, setMapSelId] = useState(null);

  useEffect(() => {
    Promise.all([fetchContent('research'), fetchFoundationLinks()]).then(([c, fl]) => {
      setItems(c.data);
      setFlinks(fl.data);
      setLoading(false);
    });
  }, []);

  const foundations = items.filter((i) => i.is_foundation);
  const papers = items.filter((i) => !i.is_foundation);
  const featured = papers.find((i) => i.tags?.includes('featured')) || papers[0];
  const rest = papers.filter((i) => i.id !== featured?.id);
  const open = items.find((i) => i.id === openId);

  // ---- Theoretical Map data ----
  const mapNodes = useMemo(
    () => [
      ...foundations.map((f) => ({ id: f.id, title: f.title, type: 'foundation' })),
      ...papers.map((p) => ({ id: p.id, title: p.title, type: 'research' })),
    ],
    [foundations, papers]
  );
  const mapEdges = useMemo(
    () => flinks.map((l) => ({ source_id: l.foundation_id, target_id: l.research_id, label: l.label })),
    [flinks]
  );
  const mapSel = items.find((i) => i.id === mapSelId);
  // Items connected to the selected map node.
  const mapConnected = useMemo(() => {
    if (!mapSelId) return [];
    const ids = new Set();
    flinks.forEach((l) => {
      if (l.foundation_id === mapSelId) ids.add(l.research_id);
      if (l.research_id === mapSelId) ids.add(l.foundation_id);
    });
    return items.filter((i) => ids.has(i.id));
  }, [mapSelId, flinks, items]);
  const linkedPaperIds = useMemo(() => new Set(flinks.map((l) => l.research_id)), [flinks]);
  const unlinkedPapers = papers.filter((p) => !linkedPaperIds.has(p.id));

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

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-10 border-b border-white/10">
        {[
          { id: 'archive', label: 'Archive' },
          { id: 'map', label: 'Theoretical Map' },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={tab === t.id
              ? 'px-4 py-2.5 text-sm font-bold text-primary border-b-2 border-primary -mb-px'
              : 'px-4 py-2.5 text-sm text-on-surface-variant hover:text-on-surface'}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-on-surface-variant">Loading constellations…</p>
      ) : tab === 'map' ? (
        <section>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <span className="flex items-center gap-2 text-sm text-on-surface-variant">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: 'var(--color-primary, #c6bfff)' }} /> Foundation ({foundations.length})
            </span>
            <span className="flex items-center gap-2 text-sm text-on-surface-variant">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: 'var(--color-secondary, #7fd4c4)' }} /> Research ({papers.length})
            </span>
            <span className="label-sm text-on-surface-variant ml-auto">{flinks.length} connections</span>
          </div>

          {mapNodes.length === 0 ? (
            <p className="text-on-surface-variant glass-card rounded-card p-8 text-center">
              Nothing to map yet. Add Foundations and Research, then link them in the dashboard.
            </p>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ConceptGraph nodes={mapNodes} links={mapEdges} selectedId={mapSelId} onSelect={setMapSelId} />
                <p className="text-xs text-on-surface-variant mt-3">Drag nodes to rearrange · click a node for details.</p>
              </div>
              <aside className="glass-card rounded-card p-6 h-fit">
                {mapSel ? (
                  <>
                    <span className="label-sm text-secondary">
                      {mapSel.is_foundation ? 'Theoretical Foundation' : 'Research'}
                    </span>
                    <h3 className="font-display text-lg font-medium mt-1 mb-2">{mapSel.title}</h3>
                    {mapSel.summary && <p className="text-sm text-on-surface-variant mb-4">{mapSel.summary}</p>}
                    <button onClick={() => setOpenId(mapSel.id)} className="text-sm text-primary font-bold mb-5 inline-flex items-center gap-1 hover:gap-2 transition-all">
                      Open details <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </button>
                    <p className="label-sm text-on-surface-variant mb-2">
                      {mapSel.is_foundation ? 'Linked research' : 'Supports foundations'} ({mapConnected.length})
                    </p>
                    {mapConnected.length === 0 ? (
                      <p className="text-xs text-on-surface-variant">No connections yet.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {mapConnected.map((c) => (
                          <button key={c.id} onClick={() => setMapSelId(c.id)}
                            className="text-left text-sm px-3 py-2 rounded-lg border border-white/10 hover:border-primary/50 transition-colors">
                            {c.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-on-surface-variant">Click a node to inspect a Foundation or Research paper and trace its connections.</p>
                )}
              </aside>
            </div>
          )}

          {unlinkedPapers.length > 0 && (
            <div className="mt-8 glass-card rounded-card p-5">
              <p className="label-sm text-secondary mb-2">Unlinked research ({unlinkedPapers.length})</p>
              <p className="text-xs text-on-surface-variant mb-3">These papers aren’t connected to any Foundation yet — link them from the dashboard.</p>
              <div className="flex flex-wrap gap-2">
                {unlinkedPapers.map((p) => (
                  <button key={p.id} onClick={() => setOpenId(p.id)}
                    className="px-3 py-1.5 rounded-full text-xs border border-white/10 text-on-surface-variant hover:border-secondary/50">
                    {p.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
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
            <div className="flex flex-wrap gap-3 mt-6">
              {open.paper_url && (
                <a href={open.paper_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg text-sm font-bold">
                  <span className="material-symbols-outlined text-base">download</span> Download paper
                </a>
              )}
              {open.source_url && (
                <a href={open.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-secondary/50 text-secondary px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-secondary/10">
                  <span className="material-symbols-outlined text-base">link</span> Open related link
                </a>
              )}
            </div>
            {(() => {
              const conn = (() => {
                const ids = new Set();
                flinks.forEach((l) => {
                  if (l.foundation_id === open.id) ids.add(l.research_id);
                  if (l.research_id === open.id) ids.add(l.foundation_id);
                });
                return items.filter((i) => ids.has(i.id));
              })();
              if (!conn.length) return null;
              return (
                <div className="mt-6">
                  <p className="label-sm text-on-surface-variant mb-2">
                    {open.is_foundation ? 'Linked research' : 'Part of foundations'} ({conn.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {conn.map((c) => (
                      <button key={c.id} onClick={() => setOpenId(c.id)}
                        className="px-3 py-1.5 rounded-full text-xs border border-white/10 text-on-surface-variant hover:border-primary/50">
                        {c.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
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
