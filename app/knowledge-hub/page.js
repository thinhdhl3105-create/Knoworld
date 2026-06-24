'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  fetchConcepts,
  fetchConceptLinks,
  fetchFrameworks,
  fetchConceptLinkedContent,
} from '@/lib/content';
import ConceptGraph from '../components/ConceptGraph';
import RequireAuth from '../components/RequireAuth';

function KnowledgeHubInner() {
  const [concepts, setConcepts] = useState([]);
  const [links, setLinks] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [linkedContent, setLinkedContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState('map'); // map | frameworks
  const [openFw, setOpenFw] = useState(null);

  useEffect(() => {
    Promise.all([
      fetchConcepts(),
      fetchConceptLinks(),
      fetchFrameworks(),
      fetchConceptLinkedContent(),
    ]).then(([c, l, f, lc]) => {
      setConcepts(c.data);
      setLinks(l.data);
      setFrameworks(f.data);
      setLinkedContent(lc.data);
      setLoading(false);
    });
  }, []);

  const selected = concepts.find((c) => c.id === selectedId);
  const related = useMemo(() => {
    if (!selectedId) return [];
    const ids = new Set();
    links.forEach((l) => {
      if (l.source_id === selectedId) ids.add(l.target_id);
      if (l.target_id === selectedId) ids.add(l.source_id);
    });
    return concepts.filter((c) => ids.has(c.id));
  }, [selectedId, links, concepts]);

  // Case studies (video + student) tied to the selected concept.
  const relatedVideos = useMemo(
    () => linkedContent.filter((x) => x.kind === 'video' && x.concept_id === selectedId),
    [linkedContent, selectedId]
  );
  const relatedStudents = useMemo(
    () => linkedContent.filter((x) => x.kind === 'student' && x.concept_id === selectedId),
    [linkedContent, selectedId]
  );

  // Group the "All concepts" list by category (Marketing, Communication, …).
  // Concepts without a category fall into a "Khác" bucket shown last.
  const groupedConcepts = useMemo(() => {
    const groups = {};
    concepts.forEach((c) => {
      const key = (c.category && c.category.trim()) || 'Khác';
      (groups[key] ||= []).push(c);
    });
    return Object.entries(groups).sort((a, b) => {
      if (a[0] === 'Khác') return 1;
      if (b[0] === 'Khác') return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [concepts]);

  return (
    <div className="pt-32 pb-24 max-w-container mx-auto px-5 md:px-16">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="h-px w-12 bg-primary" />
            <span className="label-sm text-secondary tracking-widest">Connected Knowledge</span>
          </div>
          <h1 className="h-xl mb-6">Knowledge Hub</h1>
          <p className="text-lg text-on-surface-variant max-w-2xl leading-relaxed">
            A living map of key concepts and the bridges between them — plus downloadable
            frameworks like IMC planning and branding strategy.
          </p>
        </div>
        <a href="/upload" className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-lg text-sm font-bold hover:scale-95 transition-transform whitespace-nowrap">
          <span className="material-symbols-outlined text-base">add</span> Add Concept / Framework
        </a>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {[
          { id: 'map', label: 'Concept Map', icon: 'hub' },
          { id: 'frameworks', label: 'Frameworks', icon: 'folder_open' },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={
              tab === t.id
                ? 'flex items-center gap-2 px-5 py-2 rounded-full text-sm bg-primary text-on-primary font-bold'
                : 'flex items-center gap-2 px-5 py-2 rounded-full text-sm border border-white/10 text-on-surface-variant hover:border-primary/50 transition-colors'
            }>
            <span className="material-symbols-outlined text-base">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-on-surface-variant">Loading the constellation…</p>
      ) : tab === 'map' ? (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ConceptGraph nodes={concepts} links={links} selectedId={selectedId} onSelect={setSelectedId} />
            {concepts.length > 0 && (
              <p className="text-xs text-on-surface-variant mt-3">
                Tip: click a node to read it, drag nodes to rearrange the map.
              </p>
            )}
          </div>

          <aside className="glass-card rounded-card p-6 flex flex-col">
            {selected ? (
              <>
                <span className="label-sm text-secondary">{selected.category || 'Concept'}</span>
                <h2 className="font-display text-xl font-medium mt-1 mb-3">{selected.title}</h2>
                {selected.summary && <p className="text-sm text-on-surface-variant leading-relaxed mb-3">{selected.summary}</p>}
                {selected.body && <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap mb-4">{selected.body}</p>}
                {selected.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selected.tags.map((t) => (
                      <span key={t} className="text-[11px] px-2 py-0.5 rounded border border-secondary/40 text-secondary bg-secondary/5">{t}</span>
                    ))}
                  </div>
                )}
                {related.length > 0 && (
                  <div className="pt-4 mt-4 border-t border-white/10">
                    <span className="label-sm text-on-surface-variant">Connected concepts</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {related.map((r) => (
                        <button key={r.id} onClick={() => setSelectedId(r.id)}
                          className="text-xs px-3 py-1 rounded-full border border-primary/40 text-primary hover:bg-primary/10 transition-colors">
                          {r.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(relatedVideos.length > 0 || relatedStudents.length > 0) && (
                  <div className="pt-4 mt-4 border-t border-white/10 flex flex-col gap-4">
                    {relatedVideos.length > 0 && (
                      <div>
                        <span className="label-sm text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">play_circle</span>
                          Related video case studies
                        </span>
                        <div className="flex flex-col gap-2 mt-2">
                          {relatedVideos.map((v) => (
                            <Link key={v.id} href="/videos"
                              className="text-sm text-on-surface hover:text-primary transition-colors flex items-start gap-2">
                              <span className="material-symbols-outlined text-base text-secondary mt-0.5">arrow_outward</span>
                              {v.title}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {relatedStudents.length > 0 && (
                      <div>
                        <span className="label-sm text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">school</span>
                          Related student case studies
                        </span>
                        <div className="flex flex-col gap-2 mt-2">
                          {relatedStudents.map((s) => (
                            <Link key={s.id} href={`/students/${s.id}`}
                              className="text-sm text-on-surface hover:text-primary transition-colors flex items-start gap-2">
                              <span className="material-symbols-outlined text-base text-secondary mt-0.5">arrow_outward</span>
                              {s.title}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-full py-10 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl text-primary/50 mb-3">touch_app</span>
                <p className="text-sm">Select a concept in the map to read it and see its connections.</p>
              </div>
            )}
          </aside>

          {/* concept list under the map — grouped by category */}
          {concepts.length > 0 && (
            <div className="lg:col-span-3 mt-4">
              <h3 className="h-md mb-6">All concepts</h3>
              <div className="flex flex-col gap-8">
                {groupedConcepts.map(([cat, items]) => (
                  <section key={cat}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="label-sm text-secondary tracking-widest uppercase">{cat}</span>
                      <span className="text-xs text-on-surface-variant">{items.length}</span>
                      <span className="h-px flex-1 bg-white/10" />
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {items.map((c) => (
                        <div key={c.id} role="button" tabIndex={0}
                          onClick={() => { setSelectedId(c.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          onKeyDown={(e) => e.key === 'Enter' && setSelectedId(c.id)}
                          className={`cursor-pointer text-left glass-card pulse-hover rounded-card p-5 ${selectedId === c.id ? 'ring-1 ring-primary' : ''}`}>
                          {c.category && <span className="label-sm text-secondary">{c.category}</span>}
                          <h4 className="font-display text-base font-medium mt-1 mb-1">{c.title}</h4>
                          {c.summary && <p className="text-sm text-on-surface-variant line-clamp-2">{c.summary}</p>}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Frameworks tab
        <div>
          {frameworks.length === 0 ? (
            <p className="text-on-surface-variant glass-card rounded-card p-8 text-center">
              No frameworks yet. Upload IMC planning, branding strategy and other templates from the dashboard.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {frameworks.map((f) => (
                <div key={f.id} className="glass-card pulse-hover rounded-card p-6 flex flex-col gap-3">
                  <span className="material-symbols-outlined text-primary text-3xl">description</span>
                  {f.category && <span className="label-sm text-secondary">{f.category}</span>}
                  <h3 className="font-display text-lg font-medium leading-snug">{f.title}</h3>
                  {f.summary && <p className="text-sm text-on-surface-variant line-clamp-3 flex-1">{f.summary}</p>}
                  <div className="flex flex-wrap gap-3 mt-2">
                    {f.body && (
                      <button onClick={() => setOpenFw(f)} className="text-sm text-primary font-bold flex items-center gap-1 hover:gap-2 transition-all">
                        View guide <span className="material-symbols-outlined text-base">arrow_forward</span>
                      </button>
                    )}
                    {f.file_url && (
                      <a href={f.file_url} target="_blank" rel="noreferrer" className="text-sm text-secondary font-bold flex items-center gap-1 hover:gap-2 transition-all">
                        Download <span className="material-symbols-outlined text-base">download</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Framework guide modal */}
      {openFw && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setOpenFw(null)}>
          <div className="glass-card rounded-card max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8 md:p-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className="label-sm text-secondary">{openFw.category || 'Framework'}</span>
                <h2 className="h-lg mt-1">{openFw.title}</h2>
              </div>
              <button onClick={() => setOpenFw(null)} className="material-symbols-outlined text-on-surface-variant hover:text-primary">close</button>
            </div>
            {openFw.summary && <p className="text-on-surface-variant leading-relaxed mb-4">{openFw.summary}</p>}
            {openFw.body && <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{openFw.body}</p>}
            {openFw.file_url && (
              <a href={openFw.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-6 bg-primary text-on-primary px-5 py-2.5 rounded-lg text-sm font-bold">
                <span className="material-symbols-outlined text-base">download</span> Download {openFw.file_name || 'file'}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function KnowledgeHubPage() {
  return (
    <RequireAuth>
      <KnowledgeHubInner />
    </RequireAuth>
  );
}
