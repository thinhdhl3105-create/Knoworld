'use client';

// v17: deep-link a single video via ?v=<id> (opened from global search)
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchContent, fetchConcepts } from '@/lib/content';
import { trackContentView } from '@/lib/reviews';
import { fetchHeartMap } from '@/lib/hearts';
import { getCaseAccess } from '@/lib/access';
import HeartButton from '../components/HeartButton';
import GuestLimitBanner from '../components/GuestLimitBanner';
import { useAuth } from '../components/AuthProvider';

// Normalise a YouTube/Vimeo/file URL into something embeddable.
function toEmbed(url = '') {
  if (!url) return { type: 'none' };
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  if (yt) return { type: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}` };
  if (/vimeo\.com\/(\d+)/.test(url)) return { type: 'iframe', src: `https://player.vimeo.com/video/${url.match(/vimeo\.com\/(\d+)/)[1]}` };
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) return { type: 'file', src: url };
  return { type: 'iframe', src: url };
}

function VideosPage() {
  const params = useSearchParams();
  const wantId = params.get('v');
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [hearts, setHearts] = useState({});
  // v18: stranger (guest) chỉ được xem các case được chọn.
  const [access, setAccess] = useState({ limited: false, allowedIds: null });

  useEffect(() => {
    if (user) { setAccess({ limited: false, allowedIds: null }); return; }
    getCaseAccess().then(setAccess);
  }, [user]);

  useEffect(() => {
    Promise.all([fetchContent('video'), fetchConcepts()]).then(([v, c]) => {
      setItems(v.data);
      setConcepts(c.data);
      setLoading(false);
      fetchHeartMap('content', v.data.map((i) => i.id)).then(setHearts);
      // Opened from search (?v=<id>) → jump straight into that video.
      if (wantId) {
        const match = v.data.find((i) => String(i.id) === String(wantId));
        if (match) { trackContentView(); setActive(match); }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantId]);

  const conceptById = useMemo(() => Object.fromEntries(concepts.map((c) => [c.id, c])), [concepts]);

  // v18: lọc theo quyền — guest chỉ thấy các case được chọn.
  const visibleItems = useMemo(
    () => (access.limited && access.allowedIds
      ? items.filter((i) => access.allowedIds.has(String(i.id)))
      : items),
    [items, access]
  );

  // Đóng video đang mở (vd. deep-link ?v=) nếu guest không được xem case đó.
  useEffect(() => {
    if (access.limited && access.allowedIds && active && !access.allowedIds.has(String(active.id))) {
      setActive(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, active?.id]);

  const groups = useMemo(() => {
    const map = {};
    visibleItems.forEach((i) => {
      const k = i.category || 'Uncategorised';
      (map[k] = map[k] || []).push(i);
    });
    return map;
  }, [visibleItems]);

  const player = active ? toEmbed(active.media_url) : null;

  // Mở 1 video = xem 1 nội dung → tính cho lời mời đánh giá.
  const openVideo = (item) => {
    trackContentView();
    setActive(item);
  };

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

      {access.limited && <GuestLimitBanner count={access.allowedIds?.size ?? 5} />}

      {loading ? (
        <p className="text-on-surface-variant">Loading…</p>
      ) : visibleItems.length === 0 ? (
        <p className="text-on-surface-variant glass-card rounded-card p-8 text-center">
          {access.limited
            ? 'No preview cases are available on this page yet.'
            : 'No videos yet. Upload a file or paste a YouTube link from the dashboard to get started.'}
        </p>
      ) : (
        Object.entries(groups).map(([cat, vids]) => (
          <CategoryRow key={cat} cat={cat} vids={vids} conceptById={conceptById} onPick={openVideo} hearts={hearts} />
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
              <div className="flex items-center gap-3">
                <HeartButton type="content" id={active.id} data={hearts[active.id]} />
                <button onClick={() => setActive(null)} className="material-symbols-outlined text-on-surface-variant hover:text-primary">close</button>
              </div>
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

export default function VideosPageWrapper() {
  return (
    <Suspense fallback={<div className="pt-32 px-5 max-w-container mx-auto text-on-surface-variant">Loading…</div>}>
      <VideosPage />
    </Suspense>
  );
}

// Show this many in the row before the "View all" affordance; clicking the
// category title expands the whole category into a grid.
const ROW_LIMIT = 8;
const GRADS = ['from-[#1b2a4a]', 'from-[#3a2a4a]', 'from-[#2a3a3a]'];

// A horizontal, drag-to-scroll slider of video cards for one category.
// Capped at ROW_LIMIT; expandable into a full grid via the title / "View all".
function CategoryRow({ cat, vids, conceptById, onPick, hearts = {} }) {
  const scroller = useRef(null);
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });
  const [expanded, setExpanded] = useState(false);

  const hasMore = vids.length > ROW_LIMIT;
  const shown = expanded ? vids : vids.slice(0, ROW_LIMIT);

  const by = (dir) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: 'smooth' });
  };

  const onDown = (e) => {
    const el = scroller.current;
    if (!el) return;
    drag.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
  };
  const onMove = (e) => {
    const el = scroller.current;
    if (!el || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.startScroll - dx;
  };
  const endDrag = () => {
    drag.current.active = false;
    setTimeout(() => (drag.current.moved = false), 0);
  };

  return (
    <section className="mb-14">
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="flex items-baseline gap-3">
          <button
            type="button"
            onClick={() => hasMore && setExpanded((v) => !v)}
            className={`group text-left ${hasMore ? 'cursor-pointer' : 'cursor-default'}`}
            title={hasMore ? (expanded ? 'Collapse' : 'Show all videos') : undefined}
          >
            <h2 className="h-md inline-flex items-center gap-1 group-hover:text-primary transition-colors">
              {cat}
              {hasMore && (
                <span className="material-symbols-outlined text-xl text-on-surface-variant group-hover:text-primary transition-colors">
                  {expanded ? 'expand_less' : 'chevron_right'}
                </span>
              )}
            </h2>
          </button>
          <span className="label-sm text-on-surface-variant">{vids.length} videos</span>
        </div>
        {expanded ? (
          <button onClick={() => setExpanded(false)} className="text-xs font-bold text-primary whitespace-nowrap">
            Show less
          </button>
        ) : (
          <div className="hidden sm:flex items-center gap-2">
            {hasMore && (
              <button onClick={() => setExpanded(true)} className="text-xs font-bold text-primary mr-1 whitespace-nowrap">
                View all
              </button>
            )}
            <button onClick={() => by(-1)} aria-label="Scroll left"
              className="glass-card h-9 w-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary/50 transition-colors">
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <button onClick={() => by(1)} aria-label="Scroll right"
              className="glass-card h-9 w-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary/50 transition-colors">
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>
        )}
      </div>

      {expanded ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {vids.map((item, i) => (
            <VideoCard
              key={item.id}
              item={item}
              grad={GRADS[i % 3]}
              concept={item.concept_id && conceptById[item.concept_id]}
              onPick={() => onPick(item)}
              heart={hearts[item.id]}
              grid
            />
          ))}
        </div>
      ) : (
        <div
          ref={scroller}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory cursor-grab active:cursor-grabbing select-none"
          style={{ scrollbarWidth: 'thin' }}
        >
          {shown.map((item, i) => (
            <VideoCard
              key={item.id}
              item={item}
              grad={GRADS[i % 3]}
              concept={item.concept_id && conceptById[item.concept_id]}
              onPick={() => { if (!drag.current.moved) onPick(item); }}
              heart={hearts[item.id]}
            />
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="group glass-card rounded-card shrink-0 snap-start w-[160px] flex flex-col items-center justify-center gap-2 text-on-surface-variant hover:text-primary hover:border-primary/50 transition-colors"
            >
              <span className="material-symbols-outlined text-3xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
              <span className="text-sm font-bold">View all {vids.length}</span>
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function VideoCard({ item, grad, concept, onPick, heart, grid = false }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPick}
      onKeyDown={(e) => e.key === 'Enter' && onPick()}
      className={`group glass-card pulse-hover rounded-card overflow-hidden flex flex-col text-left cursor-pointer ${grid ? 'w-full' : 'shrink-0 snap-start w-[280px] sm:w-[300px]'}`}
    >
      <div className={`relative aspect-[16/10] bg-gradient-to-br ${grad} to-[#0e0d16]`}>
        {item.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.cover_url} alt={item.title} draggable={false} className="absolute inset-0 w-full h-full object-cover" />
        ) : null}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="material-symbols-outlined text-5xl text-white/90 group-hover:scale-110 transition-transform">play_circle</span>
        </div>
      </div>
      <div className="p-5 flex flex-col gap-2.5 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-medium leading-snug group-hover:text-primary transition-colors line-clamp-1">{item.title}</h3>
          <HeartButton type="content" id={item.id} data={heart} size="sm" className="shrink-0 -mt-0.5" />
        </div>
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
}
