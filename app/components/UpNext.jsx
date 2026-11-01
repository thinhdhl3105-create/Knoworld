'use client';

import Link from 'next/link';
import { contentHref } from '@/lib/engagement';

function thumbOf(it) {
  if (it.cover_url) return it.cover_url;
  if (Array.isArray(it.images) && it.images[0]) return it.images[0];
  const yt = (it.media_url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  return yt ? `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg` : null;
}

const KIND_ICON = { video: 'play_circle', student: 'school', image: 'image' };

// v24: "Up next" — gợi ý 3 case cùng concept / cùng nhóm để giữ mạch khám phá.
export function pickUpNext(current, pool = [], n = 3) {
  if (!current) return [];
  const others = pool.filter((x) => x.id !== current.id);
  const score = (x) =>
    (current.concept_id && x.concept_id === current.concept_id ? 4 : 0) +
    (current.category && x.category === current.category ? 2 : 0) +
    (current.brand && x.brand === current.brand ? 1 : 0) +
    (Array.isArray(current.tags) && Array.isArray(x.tags) && x.tags.some((t) => current.tags.includes(t)) ? 1 : 0);
  return others
    .map((x) => ({ x, s: score(x) }))
    .sort((a, b) => b.s - a.s || String(b.x.created_at || '').localeCompare(String(a.x.created_at || '')))
    .slice(0, n)
    .map((o) => o.x);
}

export default function UpNext({ items = [], onPick, title = 'Up next' }) {
  if (!items.length) return null;
  return (
    <section className="mt-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-secondary text-lg">explore</span>
        <span className="label-sm text-on-surface-variant">{title}</span>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        {items.map((it) => {
          const thumb = thumbOf(it);
          const inner = (
            <>
              <div className="aspect-video rounded-lg overflow-hidden bg-surface-container-high mb-2 relative">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full grid place-items-center bg-gradient-to-br from-[#2a2350] to-surface-container-low">
                    <span className="material-symbols-outlined text-primary/60 text-3xl">{KIND_ICON[it.kind] || 'auto_awesome'}</span>
                  </div>
                )}
              </div>
              <p className="text-sm font-medium text-on-surface line-clamp-2 group-hover:text-primary transition-colors">{it.title}</p>
              {it.category && <p className="text-[11px] text-on-surface-variant mt-0.5">{it.category}</p>}
            </>
          );
          return onPick ? (
            <button key={it.id} type="button" onClick={() => onPick(it)} className="group text-left glass-card rounded-card p-2.5 hover:border-primary/40 transition-colors">
              {inner}
            </button>
          ) : (
            <Link key={it.id} href={contentHref(it.kind, it.id)} className="group glass-card rounded-card p-2.5 hover:border-primary/40 transition-colors">
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
