'use client';

// v16: hearts on student case study detail
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchContentById, fetchContent } from '@/lib/content';
import { trackContentView } from '@/lib/reviews';
import { fetchHeartMap } from '@/lib/hearts';
import HeartButton from '../../components/HeartButton';
import ReactionBar from '../../components/ReactionBar';
import UpNext, { pickUpNext } from '../../components/UpNext';

// v24: "Think first, then reveal" — người đọc tự nghĩ trước khi mở từng phần.
// Không chấm điểm; ghi chú chỉ lưu trên trình duyệt của chính họ.
const PROMPTS = {
  insight: 'Given this context, what consumer insight would you build on?',
  creative_approach: 'With that insight, what creative idea would you pitch?',
  execution: 'How would you bring the idea to life — channels, touchpoints, timing?',
};
const PREF_KEY = 'kw_reveal_mode'; // 'think' | 'all'
const noteKey = (id, k) => `kw_note_${id}_${k}`;
function readLS(k, d = '') { try { return localStorage.getItem(k) ?? d; } catch { return d; } }
function writeLS(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }

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
  const [heart, setHeart] = useState(null);
  const [pool, setPool] = useState([]);
  const [mode, setMode] = useState('think');
  const [revealed, setRevealed] = useState(1); // số phần đang hiện (Context luôn hiện)
  const [notes, setNotes] = useState({});

  useEffect(() => {
    setMode(readLS(PREF_KEY, 'think') === 'all' ? 'all' : 'think');
    fetchContent('student').then(({ data }) => setPool(data || []));
  }, []);
  useEffect(() => {
    if (!id) return;
    setRevealed(1);
    setNotes(Object.fromEntries(Object.keys(PROMPTS).map((k) => [k, readLS(noteKey(id, k))])));
  }, [id]);
  const switchMode = (m) => { setMode(m); writeLS(PREF_KEY, m); };
  const setNote = (k, v) => { setNotes((n) => ({ ...n, [k]: v })); writeLS(noteKey(id, k), v); };

  useEffect(() => {
    fetchContentById(id).then(({ data }) => {
      setItem(data);
      setLoading(false);
      // Mở chi tiết 1 case study = xem 1 nội dung (lời mời đánh giá + Most viewed).
      trackContentView(data ? { id: data.id, kind: data.kind || 'student' } : undefined);
      if (data) fetchHeartMap('content', [data.id]).then((m) => setHeart(m[data.id] || null));
    });
  }, [id]);

  if (loading) {
    return (
      <div className="pt-32 pb-24 max-w-container mx-auto px-5 md:px-16 flex flex-col gap-5">
        <div className="kw-skel h-6 w-40" />
        <div className="kw-skel h-14 w-2/3" />
        <div className="kw-skel h-[320px] w-full" />
      </div>
    );
  }
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
    item.brand && { icon: 'sell', value: item.brand },
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
        <div className="flex items-center justify-between gap-4">
          <span className="label-sm text-secondary tracking-widest">{item.category || 'Student Case Study'}</span>
          <HeartButton type="content" id={item.id} data={heart} />
        </div>
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
        <ReactionBar contentId={item.id} className="mt-6" />
      </header>

      {item.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.cover_url} alt={item.title} className="w-full rounded-card mb-14 max-h-[460px] object-cover border border-white/10" />
      )}

      {activeSections.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mb-10 text-sm">
          <span className="text-on-surface-variant mr-1">Reading mode:</span>
          {[
            { id: 'think', icon: 'psychology', label: 'Think first, then reveal' },
            { id: 'all', icon: 'article', label: 'Show everything' },
          ].map((m) => (
            <button key={m.id} type="button" onClick={() => switchMode(m.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                mode === m.id ? 'bg-primary text-on-primary' : 'border border-white/10 text-on-surface-variant hover:border-primary/40'
              }`}>
              <span className="material-symbols-outlined text-base">{m.icon}</span>{m.label}
            </button>
          ))}
        </div>
      )}

      {/* Alternating image + text rows */}
      <div className="flex flex-col gap-14">
        {activeSections.map((s, i) => {
          const hidden = mode === 'think' && i >= revealed;
          if (hidden && i > revealed) return null;
          if (hidden) {
            // Ô "tự nghĩ trước" cho phần kế tiếp
            return (
              <section key={s.key} className="glass-card rounded-card p-6 md:p-8 border-dashed border-primary/30 kw-page">
                <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-secondary">{s.icon}</span>
                  <h2 className="font-display text-xl font-medium">Next: {s.label}</h2>
                  <span className="ml-auto text-xs text-on-surface-variant">{i + 1}/{activeSections.length}</span>
                </div>
                <p className="text-on-surface-variant text-sm mb-4">
                  {PROMPTS[s.key] || 'Pause for a moment — what would you do here?'}
                </p>
                <textarea
                  value={notes[s.key] || ''}
                  onChange={(e) => setNote(s.key, e.target.value)}
                  rows={3}
                  maxLength={1500}
                  placeholder="Jot down your own idea (optional · saved only on this device)"
                  className="w-full bg-surface-container-lowest border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-primary focus:outline-none resize-y"
                />
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <button type="button" onClick={() => setRevealed(i + 1)}
                    className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg text-sm font-bold hover:scale-95 transition-transform">
                    <span className="material-symbols-outlined text-base">visibility</span> Reveal {s.label}
                  </button>
                  <button type="button" onClick={() => setRevealed(activeSections.length)}
                    className="text-sm text-on-surface-variant hover:text-primary">Reveal all</button>
                </div>
              </section>
            );
          }
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
                {notes[s.key]?.trim() && (
                  <div className="mt-4 rounded-lg border border-secondary/30 bg-secondary/5 p-3">
                    <span className="label-sm text-secondary flex items-center gap-1 mb-1">
                      <span className="material-symbols-outlined text-sm">edit_note</span> Your take
                    </span>
                    <p className="text-sm text-on-surface-variant whitespace-pre-wrap">{notes[s.key]}</p>
                  </div>
                )}
              </div>
              {img ? (
                <button
                  onClick={() => setLightbox(img)}
                  className={`${imageRight ? 'md:order-2' : 'md:order-1'} rounded-card overflow-hidden border border-white/10 group block w-full`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`${item.title} — ${s.label}`} className="w-full h-auto object-contain group-hover:scale-[1.02] transition-transform" />
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
      {galleryImages.length > 0 && (mode === 'all' || revealed >= activeSections.length) && (
        <section className="mt-16">
          <h2 className="h-md mb-6">More visuals from the project</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {galleryImages.map((src, i) => (
              <button key={i} onClick={() => setLightbox(src)} className="rounded-card overflow-hidden border border-white/10 group block w-full self-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`${item.title} visual ${i + 1}`} className="w-full h-auto object-contain group-hover:scale-[1.02] transition-transform" />
              </button>
            ))}
          </div>
        </section>
      )}

      {(mode === 'all' || revealed >= activeSections.length) && (
        <div className="mt-16">
          <UpNext items={pickUpNext(item, pool)} title="Explore another case" />
        </div>
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