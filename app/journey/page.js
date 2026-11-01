'use client';

import Link from 'next/link';
import { earnedBadges, journeyStages } from '@/lib/engagement';
import useProgress from '../components/useProgress';

// v24: "My Journey" — streak, lịch hoạt động 12 tuần, huy hiệu khám phá.
// Gắn với trình duyệt này (không cần đăng nhập). Không có điểm số hay bài kiểm tra.
const WEEKS = 12;

function toKey(d) {
  return d.toISOString().slice(0, 10);
}

function Calendar({ days = [], today }) {
  const set = new Set(days);
  const end = today ? new Date(`${today}T00:00:00Z`) : new Date();
  // Kết thúc ở Chủ nhật của tuần hiện tại để lưới thẳng hàng.
  const endDow = (end.getUTCDay() + 6) % 7; // Mon=0
  const last = new Date(end); last.setUTCDate(end.getUTCDate() + (6 - endDow));
  const cells = [];
  for (let i = WEEKS * 7 - 1; i >= 0; i--) {
    const d = new Date(last); d.setUTCDate(last.getUTCDate() - i);
    cells.push({ key: toKey(d), future: d > end });
  }
  const cols = Array.from({ length: WEEKS }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 w-max">
        <div className="flex flex-col gap-1 mr-1 text-[10px] text-on-surface-variant">
          {['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].map((l, i) => <span key={i} className="h-3.5 leading-[14px]">{l}</span>)}
        </div>
        {cols.map((col, i) => (
          <div key={i} className="flex flex-col gap-1">
            {col.map((c) => (
              <span
                key={c.key}
                title={c.future ? '' : `${c.key}${set.has(c.key) ? ' · active' : ''}`}
                className={`w-3.5 h-3.5 rounded-[4px] ${
                  c.future ? 'bg-transparent' : set.has(c.key) ? 'bg-secondary shadow-[0_0_8px_rgba(246,189,86,0.5)]' : 'bg-white/[0.06]'
                } ${c.key === today ? 'ring-1 ring-primary' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function JourneyPage() {
  const { progress, streak } = useProgress();

  if (!progress) {
    return (
      <div className="pt-32 pb-24 max-w-container mx-auto px-5 md:px-16 grid md:grid-cols-3 gap-5">
        {[0, 1, 2].map((i) => <div key={i} className="kw-skel h-36" />)}
        <div className="kw-skel h-48 md:col-span-3" />
      </div>
    );
  }

  const badges = earnedBadges(progress, streak);
  const earned = badges.filter((b) => b.earned).length;
  const stages = journeyStages(progress);
  const stats = [
    { icon: 'hub', label: 'Concepts explored', value: progress.concepts_explored },
    { icon: 'cases', label: 'Case studies opened', value: progress.cases_viewed },
    { icon: 'favorite', label: 'Reactions given', value: progress.hearts_given + progress.reactions_given },
    { icon: 'forum', label: 'Discussion posts', value: progress.questions + progress.answers },
  ];

  return (
    <div className="pt-32 pb-24 max-w-container mx-auto px-5 md:px-16 kw-page">
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="h-px w-12 bg-primary" />
          <span className="label-sm text-secondary tracking-widest">Your orbit</span>
        </div>
        <h1 className="h-xl mb-4">My Journey</h1>
        <p className="text-lg text-on-surface-variant max-w-2xl leading-relaxed">
          Everything here grows from your own curiosity — exploring concepts, opening cases and joining the conversation.
          It lives in this browser, no sign-in needed.
        </p>
        {!progress.available && (
          <p className="mt-4 text-sm text-secondary">Journey tracking is warming up — check back in a moment.</p>
        )}
      </header>

      {/* Streak + calendar */}
      <section className="grid lg:grid-cols-3 gap-5 mb-10">
        <div className="glass-card rounded-card p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="nebula w-60 h-60 -right-20 -top-20" style={{ background: 'radial-gradient(circle, rgba(255,138,61,0.35) 0%, rgba(19,18,27,0) 70%)' }} />
          <span className="relative label-sm text-on-surface-variant">Current streak</span>
          <div className="relative flex items-end gap-3 mt-3">
            <span className="material-symbols-outlined text-5xl text-[#ff8a3d]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            <span className="font-display text-6xl font-semibold tabular-nums leading-none">{streak.current}</span>
            <span className="text-on-surface-variant mb-1">day{streak.current === 1 ? '' : 's'}</span>
          </div>
          <p className="relative text-sm text-on-surface-variant mt-4">
            {streak.activeToday
              ? 'You explored today — the flame is lit. 🔥'
              : streak.current > 0
                ? 'Open a concept or case today to keep it going.'
                : 'Explore anything today to start a streak.'}
            <span className="block text-xs mt-1 opacity-70">Best: {streak.best} day{streak.best === 1 ? '' : 's'}</span>
          </p>
        </div>
        <div className="glass-card rounded-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <span className="label-sm text-on-surface-variant">Last {WEEKS} weeks</span>
            <span className="text-xs text-on-surface-variant">{progress.days.length} active day{progress.days.length === 1 ? '' : 's'}</span>
          </div>
          <Calendar days={progress.days} today={progress.today} />
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="glass-card rounded-card p-5">
            <span className="material-symbols-outlined text-primary">{s.icon}</span>
            <div className="font-display text-3xl font-semibold mt-2 tabular-nums">{s.value}</div>
            <div className="text-xs text-on-surface-variant mt-1">{s.label}</div>
          </div>
        ))}
      </section>

      {/* Journey stages */}
      <section className="glass-card rounded-card p-6 md:p-8 mb-10">
        <h2 className="h-md mb-6">Active Learning Flux</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {stages.map((s, i) => (
            <div key={s.key} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full grid place-items-center text-xs font-bold ${s.progress >= 1 ? 'bg-secondary text-on-secondary' : 'bg-white/10 text-on-surface-variant'}`}>
                  {s.progress >= 1 ? '✓' : i + 1}
                </span>
                <span className="font-display font-medium">{s.name}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-secondary transition-[width] duration-700" style={{ width: `${s.progress * 100}%` }} />
              </div>
              <p className="text-xs text-on-surface-variant">{s.hint}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Badges */}
      <section>
        <div className="flex items-end justify-between mb-6">
          <h2 className="h-md">Discovery badges</h2>
          <span className="text-sm text-on-surface-variant"><b className="text-on-surface">{earned}</b> / {badges.length} collected</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`rounded-card p-5 text-center flex flex-col items-center gap-2 border transition-all ${
                b.earned ? 'glass-card border-secondary/40 shadow-[0_0_24px_rgba(246,189,86,0.12)]' : 'border-white/5 bg-white/[0.02] opacity-55'
              }`}
            >
              <span
                className={`material-symbols-outlined text-4xl ${b.earned ? 'text-secondary' : 'text-on-surface-variant'}`}
                style={b.earned ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {b.earned ? b.icon : 'lock'}
              </span>
              <span className="font-display font-medium text-sm">{b.name}</span>
              <span className="text-[11px] text-on-surface-variant leading-snug">{b.desc}</span>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/knowledge-hub" className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-lg text-sm font-bold hover:scale-95 transition-transform">
            <span className="material-symbols-outlined text-base">hub</span> Explore the map
          </Link>
          <Link href="/discussion" className="inline-flex items-center gap-2 border border-white/10 px-6 py-3 rounded-lg text-sm font-bold hover:border-primary/50 transition-colors">
            <span className="material-symbols-outlined text-base">forum</span> Join the discussion
          </Link>
        </div>
      </section>
    </div>
  );
}
