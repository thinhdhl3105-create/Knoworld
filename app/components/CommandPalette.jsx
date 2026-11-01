'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchConcepts, fetchContent } from '@/lib/content';
import { contentHref } from '@/lib/engagement';

const PAGES = [
  { title: 'Home', href: '/', icon: 'home' },
  { title: 'Knowledge Hub — Concept Map', href: '/knowledge-hub', icon: 'hub' },
  { title: 'Video Case Studies', href: '/videos', icon: 'play_circle' },
  { title: 'Student Case Studies', href: '/students', icon: 'school' },
  { title: 'Image Case Studies', href: '/images', icon: 'image' },
  { title: 'News', href: '/news', icon: 'newspaper' },
  { title: 'Discussion', href: '/discussion', icon: 'forum' },
  { title: 'My Journey — streak & badges', href: '/journey', icon: 'local_fire_department' },
];
const KIND = {
  concept: { label: 'Concept', icon: 'hub' },
  video: { label: 'Video', icon: 'play_circle' },
  student: { label: 'Student case', icon: 'school' },
  image: { label: 'Image case', icon: 'image' },
  page: { label: 'Page', icon: 'arrow_outward' },
};

const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

// v24: Tìm nhanh toàn site — Ctrl+K / ⌘K hoặc phím "/".
export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [index, setIndex] = useState(null);
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable;
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === '/' && !typing) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('kw-open-palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('kw-open-palette', onOpen);
    };
  }, []);

  // Lazy-load the index the first time the palette opens.
  useEffect(() => {
    if (!open) return;
    setQ('');
    setSel(0);
    setTimeout(() => inputRef.current?.focus(), 30);
    if (index) return;
    Promise.all([fetchConcepts(), fetchContent('video'), fetchContent('student'), fetchContent('image')]).then(
      ([c, v, s, i]) => {
        const rows = [
          ...(c.data || []).map((x) => ({ kind: 'concept', id: x.id, title: x.title, sub: x.category, text: [x.summary, ...(x.tags || [])].join(' '), href: `/knowledge-hub?c=${x.id}` })),
          ...[...(v.data || []), ...(s.data || []), ...(i.data || [])].map((x) => ({
            kind: x.kind, id: x.id, title: x.title, sub: x.brand || x.category, text: [x.summary, x.category, ...(x.tags || [])].join(' '), href: contentHref(x.kind, x.id),
          })),
        ];
        setIndex(rows.map((r) => ({ ...r, _t: norm(r.title), _x: norm(`${r.sub || ''} ${r.text || ''}`) })));
      }
    );
  }, [open, index]);

  const results = useMemo(() => {
    const pages = PAGES.map((p) => ({ ...p, kind: 'page', _t: norm(p.title), _x: '' }));
    const terms = norm(q).split(/\s+/).filter(Boolean);
    if (!terms.length) return pages;
    const all = [...pages, ...(index || [])];
    return all
      .map((r) => {
        let score = 0;
        for (const t of terms) {
          if (r._t.startsWith(t)) score += 5;
          else if (r._t.includes(t)) score += 3;
          else if (r._x.includes(t)) score += 1;
          else return null;
        }
        return { r, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((o) => o.r);
  }, [q, index]);

  useEffect(() => { setSel(0); }, [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  const go = (r) => {
    if (!r) return;
    setOpen(false);
    router.push(r.href);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[12vh] bg-black/70 backdrop-blur-sm kw-page" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl glass-card rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Quick search">
        <div className="flex items-center gap-3 px-4 border-b border-white/10">
          <span className="material-symbols-outlined text-primary">search</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              if (e.key === 'Enter') { e.preventDefault(); go(results[sel]); }
            }}
            placeholder="Search concepts, case studies, pages…"
            className="flex-1 bg-transparent outline-none py-4 text-base text-on-surface placeholder:text-on-surface-variant/60"
          />
          <kbd className="hidden sm:inline text-[10px] text-on-surface-variant border border-white/10 rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div ref={listRef} className="max-h-[55vh] overflow-y-auto p-2">
          {q && !index && <p className="px-3 py-4 text-sm text-on-surface-variant">Loading the universe…</p>}
          {results.length === 0 && index && <p className="px-3 py-4 text-sm text-on-surface-variant">Nothing found for “{q}”.</p>}
          {results.map((r, i) => {
            const k = KIND[r.kind] || KIND.page;
            return (
              <button
                key={`${r.kind}-${r.id || r.href}`}
                data-i={i}
                type="button"
                onMouseEnter={() => setSel(i)}
                onClick={() => go(r)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left ${i === sel ? 'bg-primary/10' : ''}`}
              >
                <span className={`material-symbols-outlined text-lg ${i === sel ? 'text-primary' : 'text-on-surface-variant'}`}>{r.icon || k.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-on-surface truncate">{r.title}</span>
                  {r.sub && <span className="block text-[11px] text-on-surface-variant truncate">{r.sub}</span>}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-on-surface-variant">{k.label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-4 px-4 py-2 border-t border-white/10 text-[11px] text-on-surface-variant">
          <span>↑↓ navigate</span><span>↵ open</span><span className="ml-auto">Ctrl + K anywhere</span>
        </div>
      </div>
    </div>
  );
}
